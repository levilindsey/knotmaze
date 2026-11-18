// K1451 s2: the GPU sheet of census spots: today (the scene's own capture, K868 scenes/<name>.master.png,
// resampled to the tile) | master gf (this tree's tables with every pin window set back to win: master's keys)
// | this tree's gf. gf tiles are the GPU probe program's pixels (chain colour under ink, as k1451_spot.ts), home
// on unless HOME0=1, default fade unless FL. Also prints each GPU tile against the mirror (max |ink|).
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_gsheet.ts <out.png> <scene:x:y>... [--span=6] [--P=240]
// env BASE = this worktree's Vite dev server (k1362s2_vite.config.ts), default http://127.0.0.1:5541/
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import puppeteer from "puppeteer-core";
import { modelOf } from "../K1433/k1433_lib.ts";
import { buildTables } from "../../../src/render/gpu_field/tables.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
import { readPng, writePng } from "../K1314/k1314_crops.ts";
const args = process.argv.slice(2);
const out = args[0]; const spots = args.slice(1).filter((a) => !a.startsWith("--"));
const opt = (k: string, d: number): number => { const a = args.find((q) => q.startsWith(`--${k}=`)); return a ? +a.split("=")[1] : d; };
const span = opt("span", 6); const P = opt("P", 240);
const BASE = process.env.BASE ?? "http://127.0.0.1:5541/";
const home = process.env.HOME0 !== "1"; const FL = process.env.FL ? +process.env.FL : undefined;
const SC = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const prof = mkdtempSync(join(tmpdir(), "k1451-gsheet-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=600,400",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const LAB = 14; const GAP = 4; const COLS = 3;
const sheet = new Uint8Array((COLS * (P + GAP)) * (spots.length * (P + LAB + GAP)) * 3).fill(24);
const SW = COLS * (P + GAP); const SH = spots.length * (P + LAB + GAP);
const blit = (px: Uint8Array, col: number, row: number): void => {
  const dx = col * (P + GAP); const dy = row * (P + LAB + GAP) + LAB;
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) for (let k = 0; k < 3; k++) sheet[3 * ((dy + r) * SW + dx + c) + k] = px[3 * (r * P + c) + k];
};
// a tiny 3x5 digit/letter-free label: a bar of the row's index (1 px per spot number, to match the report's list)
const bar = (row: number, col: number, n: number, rgb: number[]): void => {
  const dx = col * (P + GAP); const dy = row * (P + LAB + GAP);
  for (let i = 0; i < n; i++) for (let r = 3; r < LAB - 3; r++) for (let c = 0; c < 4; c++) { const x = dx + 4 + i * 7 + c; for (let k = 0; k < 3; k++) sheet[3 * ((dy + r) * SW + x) + k] = rgb[k]; }
};
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("pageerror", String(e)));
  await page.goto(`${BASE}@vite/client`, { waitUntil: "load" });
  await page.evaluate(async (hm: boolean) => {
    const W = window as any;
    const mod = await (new Function("p", "return import(p)") as (p: string) => Promise<any>)("/src/render/gpu_field/gf_pass.ts");
    const cv = document.createElement("canvas"); cv.width = 4; cv.height = 4;
    cv.addEventListener("webglcontextlost", () => { W.__lost = (W.__lost ?? 0) + 1; });
    const gl = cv.getContext("webgl2", { antialias: false })!;
    W.__gf = { gl, mod, tg: new mod.GfTarget(gl, 3, true), hm };
  }, home);
  for (let si = 0; si < spots.length; si++) {
    const [nm, xs, ys] = spots[si].split(":"); const X = +xs, Y = +ys;
    const M = modelOf(nm); const sc = M.scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
    const T: any = buildTables(sc, { aa, home });
    const Tm: any = { ...T, pinWL: new Float64Array(T.pinWL.length).fill(T.win), pinWR: new Float64Array(T.pinWR.length).fill(T.win) };
    const ppu = P / (span * T.h); const c0 = Math.round(X * ppu - P / 2), r0 = Math.round(Y * ppu - P / 2);
    // today: the capture, bilinear, same world box
    const cap = readPng(`${SC}/${nm}.master.png`); const dpr = sc.camera.dpr; const w2c = sc.camera.worldToCss;
    const tday = new Uint8Array(P * P * 3);
    for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
      const x = (c0 + c + 0.5) / ppu, y = (r0 + r + 0.5) / ppu;
      const u = (w2c[0] * x + w2c[2] * y + w2c[4]) * dpr - 0.5, v = (w2c[1] * x + w2c[3] * y + w2c[5]) * dpr - 0.5;
      const u0 = Math.max(0, Math.min(cap.W - 2, Math.floor(u))), v0 = Math.max(0, Math.min(cap.H - 2, Math.floor(v)));
      const fu = Math.min(1, Math.max(0, u - u0)), fv = Math.min(1, Math.max(0, v - v0)); const ch = cap.px.length / (cap.W * cap.H);
      for (let k = 0; k < 3; k++) {
        const g = (uu: number, vv: number): number => cap.px[ch * (vv * cap.W + uu) + k];
        tday[3 * (r * P + c) + k] = Math.round((g(u0, v0) * (1 - fu) + g(u0 + 1, v0) * fu) * (1 - fv) + (g(u0, v0 + 1) * (1 - fu) + g(u0 + 1, v0 + 1) * fu) * fv);
      }
    }
    // dark-paper captures (ring, g41_ring_tw64) read as black at this size: stretch the tile's levels
    { let lo = 255, hi = 0; for (const v of tday) { lo = Math.min(lo, v); hi = Math.max(hi, v); } if (hi - lo > 4 && hi < 160) for (let i = 0; i < tday.length; i++) tday[i] = Math.round(255 * (tday[i] - lo) / (hi - lo)); }
    blit(tday, 0, si); bar(si, 0, si + 1, [230, 230, 230]);
    const tiles: Uint8Array[] = [];
    for (const [vi, TT] of [Tm, T].entries()) {
      const flat: Record<string, unknown> = {}; const bufs: Record<string, { t: string; d: number[] }> = {};
      for (const [k, v] of Object.entries(TT)) { if (ArrayBuffer.isView(v)) bufs[k] = { t: v.constructor.name, d: Array.from(v as any) }; else if (typeof v !== "function") flat[k] = v; }
      const G: { ink: number[]; cov: number[]; ch: number[]; lost: number; err: number } = await page.evaluate(async (a: any) => {
        const W = window as any; const { gl, mod, tg, hm } = W.__gf;
        const T: any = { ...a.flat }; for (const [k, v] of Object.entries(a.bufs) as any) T[k] = new (globalThis as any)[v.t](v.d);
        const pass = new mod.GfPass(gl, true, undefined, undefined, false, { home: hm }); pass.upload(T);
        if (a.fl !== null && "homeFade" in pass) pass.homeFade = a.fl;
        tg.resize(a.P, a.P); pass.draw(tg, [1 / a.ppu, a.c0 / a.ppu, 1 / a.ppu, a.r0 / a.ppu], [0, 0, a.P, a.P], false);
        const n = a.P * a.P; const buf = new Float32Array(4 * n); tg.read(0, buf);
        const ink = [], cov = [], ch = []; for (let i = 0; i < n; i++) { ink.push(buf[4 * i]); cov.push(buf[4 * i + 1]); ch.push(Math.round(buf[4 * i + 2])); }
        return { ink, cov, ch, lost: W.__lost ?? 0, err: gl.getError() };
      }, { flat, bufs, P, ppu, c0, r0, fl: FL ?? null });
      if (G.lost || G.err) throw new Error(`gl lost ${G.lost} err ${G.err}`);
      const E: any = new GfEval(TT); if (FL !== undefined) E.fadeLength = FL;
      const px = new Uint8Array(P * P * 3); let dmax = 0;
      for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
        const o = r * P + c; const ink = G.ink[o], cov = G.cov[o], chn = G.ch[o];
        const ev = E.eval((c0 + c + 0.5) / ppu, (r0 + r + 0.5) / ppu); dmax = Math.max(dmax, Math.abs(ev.ink - ink));
        const bg = [235, 230, 215]; const base = cov <= 0 || chn < 0 ? bg : [130 + ((chn * 53) % 100), 110 + ((chn * 97) % 100), 150 + ((chn * 31) % 90)];
        for (let k = 0; k < 3; k++) { const f = bg[k] * (1 - cov) + base[k] * cov; px[3 * o + k] = Math.round(f * (1 - ink) + 20 * ink); }
      }
      tiles.push(px); blit(px, 1 + vi, si);
      console.log(`${si + 1} ${spots[si]} ${vi ? "mine" : "master"} ppu ${ppu.toFixed(1)} GPU vs mirror max|ink| ${dmax.toFixed(4)}`);
    }
    let dpx = 0; for (let i = 0; i < tiles[0].length; i += 3) if (Math.abs(tiles[0][i] - tiles[1][i]) + Math.abs(tiles[0][i + 1] - tiles[1][i + 1]) + Math.abs(tiles[0][i + 2] - tiles[1][i + 2]) > 6) dpx++;
    console.log(`${si + 1} ${spots[si]} master vs mine: ${dpx} px differ`);
  }
  writePng(out, sheet, SW, SH);
  console.log(`wrote ${out} (${SW}x${SH}; columns today | master gf | this gf; the bar's count is the spot number)`);
} finally { await browser.close(); try { rmSync(prof, { recursive: true, force: true }); } catch { /* locked */ } }
