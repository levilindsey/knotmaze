// K1163: the pictures (a copy of s1i_pair.ts; see its header for the method). For each of S1h's 18 sites (the main
// checkout's out/s1h/sites.json; a site keeps S1h's number), form B's ink in
// three forms, the same scene, centre (the corner's V) and scale, dpr 2, in
// S1h's two windows (windowOf as s1h_pair.ts has it):
//   - zoom 4: +-3.5h around V, each device px a 4 x 4 block;
//   - play size (zoom 1): +-8h around V, one picture px per device px.
// Forms:
//   S1f  = FormB({dEdge: "skip", rootBand: 0}): S1f's final (checked here
//          against the frozen form_b_s1f_q.ts);
//   flat = FormB({rootBandScale: "flat"}): today, S1g's root band at every
//          angle (master before K1163);
//   tip  = FormB({rootBandScale: "tip"}): K1163's default, the band scaled
//          by t(theta)/t(2.0).
// Per-site pictures: S1f | flat | tip | tip - S1f | tip - flat;
// a diff panel is red where the later form has more ink, blue where it
// has less, over a faint grey of the larger ink (s1h_pair.ts's blitDiff).
// Greyscale 255 (1 - ink); a red tick in the margin marks V. Scenes get
// look.ctrlArc ??= 0.47.
// Writes out/k1163/sheet.png (every triple at zoom 4; rows 06-15 first, then
// the rest), <nn>_<group>_<scene>_<j>_<a>-<b>_z4.png and _z1.png, index.md
// and pairs.txt.
// Run: node .claude/probes/K1040/s1/s1i_mk_pair.mjs; npx.cmd vite-node .claude/probes/K1040/s1/k1163_pair.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, type FormBParams } from "../../../../src/render/field/form_b";
import { FormB as FormBF } from "./form_b_s1f_q";
import { encodePng } from "../../../../test/render/field/png";
import { CW, LH, type Canvas, type Win, ascii, blitDiff, blitGrey, canvas, drawText, frame, rect, ticks, wrap } from "./s1i_draw";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out", "k1163");
mkdirSync(outDir, { recursive: true });
const SCENES = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SITES = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1040/s1/out/s1h/sites.json";
const DPR = 2;
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : v > 0 ? "inf" : String(v));
const nn2 = (v: number) => String(v).padStart(2, "0");

interface Site {
  id: string;
  group: string;
  scene: string;
  j: number;
  jid: string;
  a: number;
  b: number;
  h: number;
  theta: number;
  x: number;
  y: number;
}
interface Corner {
  a: number;
  b: number;
  r: number;
  omega: number;
}
interface Ev {
  h: number;
  ppuDev: number;
  corners: Corner[];
  evalPoint(x: number, y: number): { ink: number };
}
const P_S1F: FormBParams = { dEdge: "skip", rootBand: 0 };
const P_TODAY: FormBParams = { rootBandScale: "flat" };
const P_RESTORED: FormBParams = { rootBandScale: "tip" };
interface Forms {
  F: Ev;
  G: Ev;
  S: Ev;
  T: Ev;
  R: Ev;
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
  const F = new FormBF(sc, { dpr: DPR }) as unknown as Ev;
  const S = new FormB(sc, { dpr: DPR, ...P_S1F }) as unknown as Ev;
  const T = new FormB(sc, { dpr: DPR, ...P_TODAY }) as unknown as Ev;
  const R = new FormB(sc, { dpr: DPR, ...P_RESTORED }) as unknown as Ev;
  r = { F, G: S, S, T, R, h: S.h, ppu: S.ppuDev, hdev: S.h * S.ppuDev };
  formCache.set(name, r);
  return r;
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function windowOf(fm: Forms, X: number, Y: number, kind: "z1" | "z4"): Win {
  const n = kind === "z1" ? clamp(Math.round(16 * fm.hdev), 160, 400) : clamp(Math.round(7 * fm.hdev), 80, 160);
  const x0 = Math.round(X * fm.ppu - n / 2) / fm.ppu;
  const y0 = Math.round(Y * fm.ppu - n / 2) / fm.ppu;
  return { n, zoom: kind === "z1" ? 1 : 4, x0, y0, px: 1 / fm.ppu, vx: (X - x0) * fm.ppu, vy: (Y - y0) * fm.ppu };
}
function inkOf(form: Ev, w: Win): Float32Array {
  const ink = new Float32Array(w.n * w.n);
  for (let j = 0; j < w.n; j++) for (let i = 0; i < w.n; i++) ink[j * w.n + i] = form.evalPoint(w.x0 + (i + 0.5) * w.px, w.y0 + (j + 0.5) * w.px).ink;
  return ink;
}
/** Each px's 4-connected distance (px) to S's 0.5 contour (a px on either side of a crossing); as s1i_sites.ts. */
function contourDist(s: Float32Array, n: number): Int32Array {
  const D = new Int32Array(n * n).fill(1 << 30);
  const q: number[] = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const a = s[k] >= 0.5;
      const nb = [i > 0 ? k - 1 : -1, i < n - 1 ? k + 1 : -1, j > 0 ? k - n : -1, j < n - 1 ? k + n : -1];
      if (nb.some((m) => m >= 0 && s[m] >= 0.5 !== a)) {
        D[k] = 0;
        q.push(k);
      }
    }
  for (let hd = 0; hd < q.length; hd++) {
    const k = q[hd];
    const i = k % n;
    const j = (k - i) / n;
    const nb = [i > 0 ? k - 1 : -1, i < n - 1 ? k + 1 : -1, j > 0 ? k - n : -1, j < n - 1 ? k + n : -1];
    for (const m of nb)
      if (m >= 0 && D[m] > D[k] + 1) {
        D[m] = D[k] + 1;
        q.push(m);
      }
  }
  return D;
}
interface Cmp {
  differ: number;
  lost: number;
  gained: number;
  maxD: number;
  far3: number;
  bbox: [number, number, number, number] | null;
}
/** c against base: px with |d ink| > 0.02, ink lost / gained by > 0.5, the largest distance of a differing px from
 * base's 0.5 contour and the count beyond 3 px (when D is given), and the differing px's bbox in h from V. */
function cmp(base: Float32Array, c: Float32Array, D: Int32Array | null, w: Win, h: number, ppu: number): Cmp {
  let differ = 0;
  let lost = 0;
  let gained = 0;
  let maxD = 0;
  let far3 = 0;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let j = 0; j < w.n; j++)
    for (let i = 0; i < w.n; i++) {
      const k = j * w.n + i;
      const d = c[k] - base[k];
      if (!(Math.abs(d) > 0.02)) continue;
      differ++;
      if (d < -0.5) lost++;
      if (d > 0.5) gained++;
      if (D) {
        const dd = D[k] >= 1 << 30 ? 999 : D[k];
        if (dd > maxD) maxD = dd;
        if (dd > 3) far3++;
      }
      const dx = (i + 0.5 - w.vx) / ppu / h;
      const dy = (j + 0.5 - w.vy) / ppu / h;
      x0 = Math.min(x0, dx);
      x1 = Math.max(x1, dx);
      y0 = Math.min(y0, dy);
      y1 = Math.max(y1, dy);
    }
  return { differ, lost, gained, maxD, far3, bbox: differ ? [x0, x1, y0, y1] : null };
}
const exactBad = (a: Float32Array, b: Float32Array) => {
  let n = 0;
  for (let k = 0; k < a.length; k++) if (Math.abs(a[k] - b[k]) > 1e-6) n++;
  return n;
};
const bboxText = (b: Cmp["bbox"]) => (b ? `x ${f(b[0], 2)}..${f(b[1], 2)}h, y ${f(b[2], 2)}..${f(b[3], 2)}h` : "none");
const cmpText = (c: Cmp, withD: boolean) =>
  c.differ === 0 ? "0 px" : `${c.differ} px (lost ${c.lost}, gained ${c.gained}${withD ? `; max ${c.maxD} px from S1f's edge, ${c.far3} beyond 3 px` : ""})`;
const filled = (c: Corner | undefined) => !!c && c.r > 1e-9 && c.omega > 1e-9;
const rText = (c: Corner | undefined, h: number) => (!c ? "none" : `${f(c.r / h)}h${filled(c) ? "" : " (empty)"}`);

// ---------------------------------------------------------------- the sites
const sites = JSON.parse(readFileSync(SITES, "utf8")) as Site[];
const GROUPS: Record<string, string> = {
  "F1-lost": "F1: fill emptied",
  "F1-j62": "F1: K1114's fifth site",
  "F2-r": "F2: a largest r move",
  "extra-tip": "F1: a largest tip move",
};
/** Rows 06-15 first (the root gate's sites), then the rest. */
const ORDER = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1, 2, 3, 4, 5, 16, 17, 18];
if (ORDER.length !== sites.length || new Set(ORDER).size !== sites.length) throw new Error("ORDER does not cover the sites");
interface Done {
  s: Site;
  no: number;
  w4: Win;
  inks4: { s: Float32Array; t: Float32Array; r: Float32Array };
  st: Record<"z1" | "z4", { TS: Cmp; RS: Cmp; RT: Cmp; eqF: number; eqG: number }>;
  rs: { S: Corner | undefined; T: Corner | undefined; R: Corner | undefined };
  files: { z1: string; z4: string };
  title: string;
}
const done: Done[] = [];
const lines: string[] = [];
const t0 = Date.now();
for (const no of ORDER) {
  const s = sites[no - 1];
  const fm = formsOf(s.scene);
  const h = fm.h;
  const cornerOf = (e: Ev) => e.corners.find((c) => c.a === s.a && c.b === s.b);
  const rs = { S: cornerOf(fm.S), T: cornerOf(fm.T), R: cornerOf(fm.R) };
  const base = `${nn2(no)}_${s.group}_${s.scene}_${s.jid}_${s.a}-${s.b}`;
  const title = `${nn2(no)} ${s.group} ${s.scene} ${s.jid} ${s.a}-${s.b}  V (${f(s.x, 3)}, ${f(s.y, 3)})`;
  const rLine = `r: S1f ${rText(rs.S, h)}, flat ${rText(rs.T, h)}, tip ${rText(rs.R, h)}`;
  const pack: Partial<Done> = { s, no, rs, title, st: {} as Done["st"], files: { z1: "", z4: "" } };
  for (const kind of ["z4", "z1"] as const) {
    const w = windowOf(fm, s.x, s.y, kind);
    const iS = inkOf(fm.S, w);
    const iT = inkOf(fm.T, w);
    const iR = inkOf(fm.R, w);
    const eqF = exactBad(iS, inkOf(fm.F, w));
    const eqG = 0; // flat runs on today's code; no frozen copy is checked
    const D = contourDist(iS, w.n);
    const TS = cmp(iS, iT, D, w, h, fm.ppu);
    const RS = cmp(iS, iR, D, w, h, fm.ppu);
    const RT = cmp(iT, iR, null, w, h, fm.ppu);
    pack.st![kind] = { TS, RS, RT, eqF, eqG };
    // The picture: a header, captions, five panels.
    const P = w.n * w.zoom;
    const gap = 16;
    const M = 16;
    const W = M + 5 * P + 4 * gap + M;
    const maxChars = Math.floor((W - 2 * M) / (CW * 2));
    const head = [
      ...wrap(ascii(title), maxChars),
      ...wrap(ascii(rLine), maxChars),
      ...wrap(ascii(`differ from S1f (|d ink| > 0.02): flat ${cmpText(TS, true)}; tip ${cmpText(RS, true)}. tip vs flat: ${cmpText(RT, false)}`), maxChars),
      ...wrap(
        ascii(
          `${GROUPS[s.group]}; window +-${f(w.n / 2 / fm.hdev, 1)}h = ${w.n} px at dpr ${DPR}, ${kind === "z1" ? "play size (zoom 1)" : "zoom 4"}; h = ${f(h, 3)} world = ${f(fm.hdev, 2)} px; ticks mark V; diffs: red = more ink in the later form, blue = less`,
        ),
        maxChars,
      ),
    ];
    const headH = head.length * LH * 2 + 6;
    const capH = LH * 2 + 4;
    const H = M + headH + capH + 8 + P + M;
    const cv = canvas(W, H);
    head.forEach((ln, i) => drawText(cv, ln, M, M + i * LH * 2, 2));
    const py = M + headH + capH + 8;
    const caps = ["S1f", "flat (today)", "tip", "tip - S1f", "tip - flat"];
    for (let p = 0; p < 5; p++) {
      const px = M + p * (P + gap);
      drawText(cv, ascii(caps[p]), px, M + headH, 2);
      if (p === 0) blitGrey(cv, iS, w, px, py);
      else if (p === 1) blitGrey(cv, iT, w, px, py);
      else if (p === 2) blitGrey(cv, iR, w, px, py);
      else if (p === 3) blitDiff(cv, iS, iR, w, px, py);
      else blitDiff(cv, iT, iR, w, px, py);
      frame(cv, px, py, P);
      ticks(cv, w, px, py);
    }
    const file = `${base}_${kind}.png`;
    writeFileSync(join(outDir, file), encodePng(W, H, cv.d));
    pack.files![kind] = file;
    if (kind === "z4") {
      pack.w4 = w;
      pack.inks4 = { s: iS, t: iT, r: iR };
    }
  }
  const d = pack as Done;
  done.push(d);
  lines.push(
    `${nn2(no)} [${s.group}] ${s.id}: ${rLine}` +
      `\n     zoom 4 (${d.w4.n} px): differ from S1f: flat ${cmpText(d.st.z4.TS, true)}, tip ${cmpText(d.st.z4.RS, true)}; tip vs flat ${cmpText(d.st.z4.RT, false)}; bbox (tip vs S1f) ${bboxText(d.st.z4.RS.bbox)}` +
      `\n     play size: differ from S1f: flat ${cmpText(d.st.z1.TS, true)}, tip ${cmpText(d.st.z1.RS, true)}; tip vs flat ${cmpText(d.st.z1.RT, false)}; bbox (tip vs S1f) ${bboxText(d.st.z1.RS.bbox)}` +
      `\n     checks (px off by > 1e-6, both windows): S1f vs frozen form_b_s1f_q.ts ${d.st.z4.eqF + d.st.z1.eqF}; `,
  );
}
{
  const tot = (kind: "z1" | "z4", k: "TS" | "RS" | "RT") => done.reduce((a, d) => a + d.st[kind][k].differ, 0);
  const totF3 = (kind: "z1" | "z4", k: "TS" | "RS") => done.reduce((a, d) => a + d.st[kind][k].far3, 0);
  const eq = done.reduce((a, d) => a + d.st.z4.eqF + d.st.z1.eqF + d.st.z4.eqG + d.st.z1.eqG, 0);
  lines.push(
    `all: zoom 4: differ from S1f flat ${tot("z4", "TS")} (beyond 3 px ${totF3("z4", "TS")}), tip ${tot("z4", "RS")} (beyond 3 px ${totF3("z4", "RS")}); tip vs flat ${tot("z4", "RT")}` +
      `\n     play size: differ from S1f flat ${tot("z1", "TS")} (beyond 3 px ${totF3("z1", "TS")}), tip ${tot("z1", "RS")} (beyond 3 px ${totF3("z1", "RS")}); tip vs flat ${tot("z1", "RT")}` +
      `\n     checks: ${eq} px off between S1f and its frozen copy`,
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
  const cellW = 3 * Pmax + 2 * gapIn + 2 * pad;
  const maxT = Math.floor((cellW - 8) / (CW * 3));
  const maxC = Math.floor((cellW - 8) / (CW * 2));
  const blocks = done.map((d) => {
    const z = d.st.z4;
    return {
      title: wrap(ascii(d.title), maxT),
      r: wrap(ascii(`r: S1f ${rText(d.rs.S, d.s.h)}, flat ${rText(d.rs.T, d.s.h)}, tip ${rText(d.rs.R, d.s.h)}`), maxC),
      diff: wrap(ascii(`differ from S1f: flat ${cmpText(z.TS, true)}; tip ${cmpText(z.RS, true)}. tip vs flat ${cmpText(z.RT, false)}`), maxC),
    };
  });
  const headH = Math.max(...blocks.map((b) => b.title.length * LH * 3 + (b.r.length + b.diff.length) * LH * 2)) + 10;
  const capH = LH * 3 + 6;
  const cellH = headH + capH + Pmax + 2 + gapCell;
  const rows = Math.ceil(done.length / cols);
  const topLines = [
    "K1163: form B ink at S1h's sites, S1f | flat (today) | tip, zoom 4 (+-3.5h around V), dpr 2",
    "S1f = FormB(dEdge skip, rootBand 0); flat = FormB(rootBandScale flat) (today); tip = FormB(rootBandScale tip) (K1163)",
    "same scene, centre (the corner's V) and scale; red tick = V; S1h's site numbers; rows 06-15 first, then the rest",
  ];
  const topH = 20 + LH * 3 + 2 * LH * 2 + 24;
  const W = M + cols * cellW + (cols - 1) * gapCell + M;
  const H = topH + rows * cellH + M;
  const cv: Canvas = canvas(W, H);
  drawText(cv, ascii(topLines[0]), M, 12, 3);
  drawText(cv, ascii(topLines[1]), M, 12 + LH * 3 + 4, 2);
  drawText(cv, ascii(topLines[2]), M, 12 + LH * 3 + 4 + LH * 2, 2);
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
    for (const ln of bl.r) {
      drawText(cv, ln, cx + 4, ty, 2, [40, 40, 140]);
      ty += LH * 2;
    }
    for (const ln of bl.diff) {
      drawText(cv, ln, cx + 4, ty, 2, [20, 100, 40]);
      ty += LH * 2;
    }
    const n4 = d.w4.n * 4;
    const caps = ["S1f", "flat", "tip"];
    const inks = [d.inks4.s, d.inks4.t, d.inks4.r];
    for (let q = 0; q < 3; q++) {
      const colX = cx + pad + q * (Pmax + gapIn);
      drawText(cv, caps[q], colX, cy + headH, 3);
      const ox = colX + Math.floor((Pmax - n4) / 2);
      const oy = cy + headH + capH + 2 + Math.floor((Pmax - n4) / 2);
      blitGrey(cv, inks[q], d.w4, ox, oy);
      frame(cv, ox, oy, n4);
      ticks(cv, d.w4, ox, oy, 2);
    }
  });
  writeFileSync(join(outDir, "sheet.png"), encodePng(W, H, cv.d));
  lines.push(`sheet.png: ${W} x ${H}, ${done.length} triples, ${cols} columns, panels up to ${Pmax} px`);
}

// ---------------------------------------------------------------- the index
{
  const L: string[] = [];
  L.push("# K1163: the softer root gate (the tip-scaled band)");
  L.push("");
  L.push("Form B's ink at S1h's 18 sites (S1h's numbers and order of `out/s1h/sites.json`), in three forms, the same scene, centre (the");
  L.push("corner's V) and scale, dpr 2, greyscale `255 (1 - ink)`, `look.ctrlArc ??= 0.47`:");
  L.push("");
  L.push("- **S1f** = `FormB({dEdge: \"skip\", rootBand: 0})`, S1f's final (equal to the frozen `form_b_s1f_q.ts` at every site: `pairs.txt`);");
  L.push("- **flat** = `FormB({rootBandScale: \"flat\"})`: today (master before K1163), S1g's root band 0.5h at every angle;");
  L.push("- **tip** = `FormB({rootBandScale: \"tip\"})` (the default): K1163's band, rootBand*h*min(1, t(theta)/t(2.0)) with");
  L.push("  t(theta) = 1/sin(theta/2) - 1, so the tip moves at about 1.1x the root's speed at every angle.");
  L.push("");
  L.push("- `sheet.png`: every triple S1f | flat | tip at zoom 4 (each device px a 4 x 4 block), +-3.5h around V (the window is clamped to");
  L.push("  80..160 px). Rows 06-15 first (the root gate's sites), then the rest.");
  L.push("- `<n>_<group>_<scene>_<j>_<a>-<b>_z4.png` (zoom 4) and `..._z1.png` (play size, +-8h): S1f | flat | tip | tip - S1f |");
  L.push("  tip - flat. A diff panel is red where the later form has more ink, blue where it has less, over a faint grey of the larger ink.");
  L.push("- `pairs.txt`: the same numbers per site, the play-size window's too, and the S1f equivalence check.");
  L.push("");
  L.push("Columns: `r` is the site's corner radius in each form (`none` = no corner built there, `(empty)` = r or omega is 0). `differ` counts the");
  L.push("pixels whose ink differs by more than 0.02 in the zoom 4 window (lost / gained: by more than 0.5); for the comparisons with S1f, `max`");
  L.push("is the largest distance of a differing pixel from S1f's 0.5 contour (device px, 4-connected) and `far` the count beyond 3 px. The");
  L.push("play-size window's counts follow in parentheses.");
  L.push("");
  L.push("| # | group | scene | site | r: S1f / flat / tip | flat vs S1f | tip vs S1f | tip vs flat | files |");
  L.push("|---|---|---|---|---|---|---|---|---|");
  const cell = (c: Cmp, c1: Cmp, withD: boolean) =>
    `${c.differ}${withD ? ` (lost ${c.lost}, gained ${c.gained}, max ${c.maxD}, far ${c.far3})` : ""}; play ${c1.differ}${withD ? `, far ${c1.far3}` : ""}`;
  for (const d of done) {
    const s = d.s;
    L.push(
      `| ${nn2(d.no)} | ${s.group} | ${s.scene} | ${s.jid} ${s.a}-${s.b} (theta ${f(s.theta, 3)}), V (${f(s.x, 3)}, ${f(s.y, 3)}) | ${rText(d.rs.S, s.h)} / ${rText(d.rs.T, s.h)} / ${rText(d.rs.R, s.h)} | ${cell(d.st.z4.TS, d.st.z1.TS, true)} | ${cell(d.st.z4.RS, d.st.z1.RS, true)} | ${cell(d.st.z4.RT, d.st.z1.RT, false)} | [z4](${d.files.z4}) [z1](${d.files.z1}) |`,
    );
  }
  const sum = (k: "TS" | "RS" | "RT", kind: "z1" | "z4") => done.reduce((a, d) => a + d.st[kind][k].differ, 0);
  L.push(`| all | | | | | ${sum("TS", "z4")}; play ${sum("TS", "z1")} | ${sum("RS", "z4")}; play ${sum("RS", "z1")} | ${sum("RT", "z4")}; play ${sum("RT", "z1")} | |`);
  L.push("");
  L.push("## Reading the rows");
  L.push("");
  L.push("- F2 sites (06-15): S1g's root gate (flat band 0.5h) shrinks r at corners whose feet sit near an arm's root (4.000h to");
  L.push("  0.678h at 06, 2.000h to 0.03-0.08h at 12-15); the ink moves by at most 1 device px from S1f's edge. K1163's tip band");
  L.push("  (about 0.005h at rows 12-14, 0.01-0.12h at rows 06-11, 0.31h at row 15) leaves those feet clear, so tip's ink is");
  L.push("  S1f's again at rows 06-14; row 15's foot sits 0.06h from its root at 127 degrees, the case the gate exists for, and");
  L.push("  its round comes back only part way (see `pairs.txt` for its r).");
  L.push("- F1 sites (01-05, 16-18) and the rest: the root gate is saturated or absent in both bands, so flat and tip agree there;");
  L.push("  what S1i restored (the d-edge) is unchanged.");
  L.push("- The check: with the root gate off (`FormB({rootBand: 0})`), every site's ink is S1f's exactly, 0 px at both windows");
  L.push("  (`../sites_k1163_after_rb0.txt` in the gate outputs). At gate699's angle (theta = 2.0) tip and flat are bit-identical,");
  L.push("  so gate699's steps (r 0.030h, ink about 0.127) are the flat band's, unchanged.");
  L.push("- Regenerate: `node .claude/probes/K1040/s1/s1i_mk_pair.mjs`, then `npx.cmd vite-node .claude/probes/K1040/s1/k1163_pair.ts`. Scenes and");
  L.push("  `sites.json` are read in place from the main checkout (`.claude/probes/K868/scenes`, `.claude/probes/K1040/s1/out/s1h/`).");
  L.push("");
  writeFileSync(join(outDir, "index.md"), L.join("\n"));
}
lines.push(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
writeFileSync(join(outDir, "pairs.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
