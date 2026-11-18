// K1436 s2: the SCREEN scan. Reads one k1436_screen.mjs capture (fill.png, border.png, meta.json) and runs scan v2's
// band profile and strays on the GPU's pixels, plus three look checks the mirror cannot make (it has no look gap).
//
//   node scripts/run_node.mjs .claude/probes/K1436/k1436_screen_scan.ts <captureDir> <out.json> [scene dump json|-]
//   env K1436_SRC = the checkout whose src/render/gpu_field/eval.ts labels the pixels (default: this worktree)
//
// WHAT COMES FROM WHERE (the handoff names it): the INK (the band) is the screen's, from border.png (white stroke on
// the dark paper: ink = the projection of the pixel between paper and white); the COVERAGE checks read fill.png (cs=mono:
// one section colour; cov = the projection between paper and that colour). The LABELS (chain, s, group, class) and the
// mirror coverage that places the exposed edges come from GfEval on the page's own GfTables (__knotGf.tables, exported
// with the capture), evaluated at each device pixel's centre: a capture has no labels or depth, so they are the mirror's
// at the same pixel. dstray (a depth test) is the mirror scan's only.
//
// LEGIT GAP ZONE: under each under pin (pinZ < 0) the look cuts the under thread within h + gap of the over centreline
// (gf_look: gap = max(0, (casingWidth - threadWidth) / 2) + CUT_BIAS, fade ramp fadeLength * max(sin, 0.2)). A pixel
// whose mirror (chain, s) lies within Lg = (2h + gap + fade) / max(sin, 0.25) + 3 aa of such a pin is in the zone; band
// finds there are dropped (the mirror's edges do not know the cut), and the look checks split on it:
//   cut   - mirror cov > 0.9, screen cov < 0.5, OUTSIDE the zone: thread removed where the look has no cut (the kink tick)
//   speck - INSIDE the zone, |screen cov - the 7x7 median of same-chain pixels| > 0.3: dots or dashes in the cut/fade
//           (the dotted line across a faded under thread)
//   spill - screen cov > 0.5 where mirror cov < 0.1, 2 px or more from any mirror cover: paint where the field has none
// Finds keep scan v2's JSON form ({kind, cls, x, y, px, peak} in world units) plus `site`: the nearest named crossing
// (x<i>, the dump's index) or junction (j<id>) within 1.5 world units, from the scene dump when given, else the page's
// own pins (p<chain>.<k>).
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { makeJudge, rasterJudge, analyze, finds, STRAY, type Raster, type Find } from "../K1433/k1433_lib.ts";
import { bandSites, bandFinds, P as PAR } from "./k1436_lib.ts";
const [capDir, out, dumpPath] = process.argv.slice(2);
if (process.env.K1436_DWPX === undefined) PAR.DWPX = 0.6;
if (process.env.K1436_WIDE === undefined) PAR.WIDE = 0;
if (process.env.K1436_MINPX === undefined) PAR.MINPX = 9;
const RSTRAY_MIN = +(process.env.K1436_RSTRAY_MIN ?? 7);
const SRC = process.env.K1436_SRC ?? resolve(import.meta.dirname, "../../..");
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const { chainAt } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);

// --- PNG (8-bit RGB / RGBA, non-interlaced: what puppeteer writes)
function png(p: string): { w: number; h: number; ch: number; d: Uint8Array } {
  const b = readFileSync(p); let o = 8; let w = 0, h = 0, ct = 0; const idat: Buffer[] = [];
  while (o < b.length) { const len = b.readUInt32BE(o); const ty = b.toString("ascii", o + 4, o + 8); const dat = b.subarray(o + 8, o + 8 + len);
    if (ty === "IHDR") { w = dat.readUInt32BE(0); h = dat.readUInt32BE(4); ct = dat[9]; if (dat[8] !== 8 || dat[12] !== 0) throw new Error("png: 8-bit, non-interlaced only"); }
    else if (ty === "IDAT") idat.push(dat); else if (ty === "IEND") break; o += 12 + len; }
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!ch) throw new Error(`png colour type ${ct}`);
  const raw = inflateSync(Buffer.concat(idat)); const st = w * ch; const d = new Uint8Array(w * h * ch);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)]; const src = y * (st + 1) + 1;
    for (let x = 0; x < st; x++) { const a = x >= ch ? d[y * st + x - ch] : 0, up = y ? d[(y - 1) * st + x] : 0, ul = y && x >= ch ? d[(y - 1) * st + x - ch] : 0; let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const pp = a + up - ul, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - ul); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : ul; }
      d[y * st + x] = v & 255; } }
  return { w, h, ch, d };
}
const meta = JSON.parse(readFileSync(join(capDir, "meta.json"), "utf8"));
const T: any = {};
for (const [k, v] of Object.entries<any>(meta.T)) {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  else T[k] = v;
}
const F = png(join(capDir, "fill.png")), B = png(join(capDir, "border.png"));
const dpr = meta.dpr; const ppu = meta.view.s * dpr; const ox = meta.view.x * dpr, oy = meta.view.y * dpr;
// ROI: the knot's bbox + 2h, clipped to the screen (device px)
let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (let i = 0; i < T.vx.length; i++) { const x = T.vx[i], y = T.vy[i]; if (!(x === x) || !(y === y)) continue; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
const pad = 2 * T.h;
const pc0 = Math.max(0, Math.floor((x0 - pad) * ppu + ox)), pr0 = Math.max(0, Math.floor((y0 - pad) * ppu + oy));
const pc1 = Math.min(F.w, Math.ceil((x1 + pad) * ppu + ox)), pr1 = Math.min(F.h, Math.ceil((y1 + pad) * ppu + oy));
const w = pc1 - pc0, h = pr1 - pr0; const c0 = pc0 - ox, r0 = pr0 - oy; // raster col c = device col pc0 + c; world x = (c0 + c + 0.5) / ppu
const t0 = Date.now();
const J = makeJudge(new GfEval(T));
const R: Raster = rasterJudge(J, c0, r0, w, h, ppu); const msR = Date.now() - t0;
const mcov = R.cov.slice(), mink = R.ink.slice();
// --- screen colours: paper from the ROI's corners' median, the fill colour from the median where the mirror is full
const px = (I: typeof F, c: number, r: number, k: number): number => I.d[((pr0 + r) * I.w + pc0 + c) * I.ch + k] / 255;
const med = (a: number[]): number => { a.sort((p, q) => p - q); return a[a.length >> 1] ?? 0; };
const paper = [0, 1, 2].map((k) => med([px(F, 0, 0, k), px(F, w - 1, 0, k), px(F, 0, h - 1, k), px(F, w - 1, h - 1, k), px(B, 0, 0, k), px(B, w - 1, h - 1, k)]));
const full: number[][] = [[], [], []];
for (let i = 0; i < w * h; i += 7) if (mcov[i] > 0.99) { const c = i % w, r = (i / w) | 0; for (let k = 0; k < 3; k++) full[k].push(px(F, c, r, k)); }
const fillC = full.map(med); const white = [1, 1, 1];
const proj = (I: typeof F, c: number, r: number, A: number[], Bc: number[]): number => { let num = 0, den = 0; for (let k = 0; k < 3; k++) { const d = Bc[k] - A[k]; num += (px(I, c, r, k) - A[k]) * d; den += d * d; } return den > 1e-9 ? Math.min(1, Math.max(0, num / den)) : 0; };
const scov = new Float32Array(w * h), sink = new Float32Array(w * h);
for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const i = r * w + c; scov[i] = proj(F, c, r, paper, fillC); sink[i] = proj(B, c, r, paper, white); }
// alignment check: mean |screen - mirror| ink at offsets (the device grid must be the mirror's)
let agree = 0, nA = 0; for (let i = 0; i < w * h; i += 3) if (mcov[i] > 0.02) { agree += Math.abs(scov[i] - mcov[i]); nA++; }
R.ink = sink; R.dstray = new Uint8Array(w * h);
// --- the legit gap zone
const gap = Math.max(0, (meta.style.casingWidth - meta.style.threadWidth) / 2) + 0.02; const fade = Math.max(0, meta.fadeLength ?? 0);
interface UPin { c: number; s: number; L: number; x: number; y: number }
const unders: UPin[] = [], overs: { x: number; y: number; tx: number; ty: number }[] = [];
for (let c = 0; c < T.cPinN.length; c++) for (let k = 0; k < T.cPinN[c]; k++) { const s = T.pinS[T.cPin0[c] + k], z = T.pinZ[T.cPin0[c] + k]; const p = chainAt(T, c, s); if (z > 0) overs.push(p); else if (z < 0) unders.push({ c, s, L: 0, x: p.x, y: p.y, ...{ tx: p.tx, ty: p.ty } } as any); }
for (const u of unders as any[]) { let best = Infinity, sn = 0.25; for (const o of overs) { const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < best) { best = d; sn = Math.abs(u.tx * o.ty - u.ty * o.tx); } } u.L = (2 * T.h + gap + fade) / Math.max(sn, 0.25) + 3 * T.aa; }
const byChain = new Map<number, UPin[]>(); for (const u of unders) { if (!byChain.has(u.c)) byChain.set(u.c, []); byChain.get(u.c)!.push(u); }
const zone = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) { const ch = R.chain[i]; if (ch < 0 || mcov[i] < 0.02) continue; const L = byChain.get(ch); if (!L) continue; const s = R.s[i];
  for (const u of L) { let d = Math.abs(s - u.s); if (T.cClosed[ch]) d = Math.min(d, T.cLen[ch] - d); if (d < u.L) { zone[i] = 1; break; } } }
// --- band profile (screen ink, mirror edges; mono: no colour seams) and strays, gap zone dropped
const Fl = analyze(R, T);
const S = bandSites(R, T, () => 0);
for (let k = 0; k < S.n; k++) if (zone[S.pix[k]]) S.flag[k] = 0;
const rs = Fl.rstray; for (let i = 0; i < w * h; i++) if (zone[i]) rs[i] = 0;
// --- look checks
const cut = new Uint8Array(w * h), speck = new Uint8Array(w * h), spill = new Uint8Array(w * h);
// distance (px) to mirror cover > 0.1 (chamfer)
const dC = new Float32Array(w * h).fill(1e9); for (let i = 0; i < w * h; i++) if (mcov[i] >= 0.1) dC[i] = 0;
for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const i = r * w + c; let d = dC[i]; if (c > 0) d = Math.min(d, dC[i - 1] + 1); if (r > 0) { d = Math.min(d, dC[i - w] + 1); if (c > 0) d = Math.min(d, dC[i - w - 1] + 1.414); if (c + 1 < w) d = Math.min(d, dC[i - w + 1] + 1.414); } dC[i] = d; }
for (let r = h - 1; r >= 0; r--) for (let c = w - 1; c >= 0; c--) { const i = r * w + c; let d = dC[i]; if (c + 1 < w) d = Math.min(d, dC[i + 1] + 1); if (r + 1 < h) { d = Math.min(d, dC[i + w] + 1); if (c + 1 < w) d = Math.min(d, dC[i + w + 1] + 1.414); if (c > 0) d = Math.min(d, dC[i + w - 1] + 1.414); } dC[i] = d; }
const nb: number[] = [];
for (let r = 3; r < h - 3; r++) for (let c = 3; c < w - 3; c++) { const i = r * w + c;
  if (!zone[i] && mcov[i] > 0.9 && scov[i] < 0.5) {
    // a mirror-full pixel the look emptied outside any cut: also require 3x3 mirror-full (not an AA rim)
    let ok = true; for (let dr = -1; dr <= 1 && ok; dr++) for (let dc = -1; dc <= 1; dc++) if (mcov[i + dr * w + dc] < 0.9) { ok = false; break; }
    if (ok) cut[i] = 1;
  }
  if (zone[i] && mcov[i] > 0.5) { nb.length = 0; const ch = R.chain[i];
    for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) { const q = i + dr * w + dc; if (R.chain[q] === ch && mcov[q] > 0.5 && Math.abs(R.s[q] - R.s[i]) < 2 * T.h) nb.push(scov[q]); }
    if (nb.length >= 20 && Math.abs(scov[i] - med(nb)) > 0.3) speck[i] = 1; }
  if (scov[i] > 0.5 && mcov[i] < 0.1 && dC[i] >= 2) spill[i] = 1;
}
const MINLOOK = +(process.env.K1436_MINLOOK ?? 4);
const all: (Find & { site?: string })[] = [
  ...finds(rs, R, c0, r0, "rstray", (i) => R.ink[i], RSTRAY_MIN),
  ...bandFinds(R, T, c0, r0, S),
  ...finds(cut, R, c0, r0, "cut", (i) => mcov[i] - scov[i], MINLOOK),
  ...finds(speck, R, c0, r0, "speck", (i) => Math.abs(scov[i] - mcov[i]), MINLOOK),
  ...finds(spill, R, c0, r0, "spill", (i) => scov[i], MINLOOK),
];
// --- names
const named: { n: string; x: number; y: number }[] = [];
if (dumpPath && dumpPath !== "-") { const D = JSON.parse(readFileSync(dumpPath, "utf8"));
  (D.crossings ?? []).forEach((X: any, k: number) => { try { const p = chainAt(T, X.a.chain, X.a.s); named.push({ n: `x${k}`, x: p.x, y: p.y }); } catch { /* */ } });
  for (const J2 of D.junctions ?? []) named.push({ n: J2.id, x: J2.c[0], y: J2.c[1] });
} else { for (let c = 0; c < T.cPinN.length; c++) for (let k = 0; k < T.cPinN[c]; k++) { const p = chainAt(T, c, T.pinS[T.cPin0[c] + k]); named.push({ n: `p${c}.${k}`, x: p.x, y: p.y }); } }
for (const f of all) { let b = 1.5, n = ""; for (const q of named) { const d = Math.hypot(q.x - f.x, q.y - f.y); if (d < b) { b = d; n = q.n; } } f.site = n; }
const cnt: Record<string, number> = {}, pxs: Record<string, number> = {};
for (const f of all) { const k = `${f.kind}:${f.cls}`; cnt[k] = (cnt[k] ?? 0) + 1; pxs[k] = (pxs[k] ?? 0) + f.px; }
let nz = 0; for (let i = 0; i < w * h; i++) nz += zone[i];
const ms = Date.now() - t0;
writeFileSync(out, JSON.stringify({ cap: capDir, hash: meta.hash, job: meta.job, ppu, roi: [pc0, pr0, pc1, pr1], paper, fill: fillC, align: nA ? agree / nA : -1, zonePx: nz, params: PAR, rstrayMin: RSTRAY_MIN, cnt, px: pxs, ms: { raster: msR, all: ms }, finds: all }));
console.log(`${meta.job?.name ?? capDir}\t${all.length}\t${JSON.stringify(cnt)}\talign ${(nA ? agree / nA : -1).toFixed(3)}\t${ms} ms`);
