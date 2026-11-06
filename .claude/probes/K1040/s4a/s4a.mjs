// K1040 S4a: the band pass's page runner (s3.mjs's launch and error rules).
// Run it under the perf lock: run_locked.ps1 does.
//   node s4a.mjs check [scene,...] [--scale 2]   check #12 + sheets (zoom 4:
//       reference | GPU | difference) of junction sites and the worst spots
//   node s4a.mjs time [scene,...] [--scale 2] [--frames 40] [--rounds 5] [--fit 411x753]
//   node s4a.mjs diag [scene,...] [--n 6] [--tol 8]   the last check's worst spots, pixel by pixel
// Writes out/<mode>_<scene>.json, out/<mode>_summary.md, out/sheets/*.png.
import puppeteer from "puppeteer-core";
import { rolldown } from "rolldown";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, appendFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const worktree = resolve(here, "../../../..");
const top = execSync("git rev-parse --show-toplevel", { cwd: process.cwd() }).toString().trim();
const norm = (p) => resolve(p).replace(/\\/g, "/").toLowerCase();
if (norm(top) !== norm(worktree)) {
  console.error(`refusing: git toplevel ${top} is not this probe's worktree ${worktree}`);
  process.exit(2);
}

const SCENES = [
  "muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper",
  "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64",
];
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const args = process.argv.slice(2);
const mode = args[0];
if (mode !== "check" && mode !== "time" && mode !== "diag") {
  console.error("usage: node s4a.mjs check|time|diag [scene,...] [--scale s] [--frames n] [--rounds n] [--fit WxH] [--tag t] [--n n] [--tol t]");
  process.exit(2);
}
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const pos = args.slice(1).filter((a, i, all) => !a.startsWith("--") && !(i > 0 && all[i - 1].startsWith("--")));
const scenes = pos.length ? pos[0].split(",") : SCENES;
const scale = Number(val("--scale", 2)), frames = Number(val("--frames", 40)), rounds = Number(val("--rounds", 5));
const tag = val("--tag", "");
const fitArg = val("--fit", null);
const fit = fitArg ? fitArg.split("x").map(Number) : undefined;
const pre = tag ? `${mode}_${tag}` : mode;
const outDir = join(here, "out");
const sheetDir = join(outDir, "sheets");
mkdirSync(sheetDir, { recursive: true });

// PNG (RGB, 8 bit).
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
// A sheet: one row per crop, columns reference | GPU | difference (red: the
// GPU inks more, blue: less, x4), zoom Z, 6 px gutters.
const Z = 4, G = 6;
function sheet(file, list) {
  if (!list.length) return;
  const zmax = Math.max(...list.map((c) => c.z));
  const cw = zmax * Z, w = 3 * cw + 4 * G;
  const h = list.length * (cw + G) + G;
  const rgb = new Uint8Array(w * h * 3).fill(60);
  const put = (x, y, r, g, b) => { const o = (y * w + x) * 3; rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b; };
  list.forEach((c, row) => {
    const y0 = G + row * (cw + G);
    for (let j = 0; j < c.z; j++)
      for (let i = 0; i < c.z; i++) {
        const r = c.ref[j * c.z + i], g = c.gpu[j * c.z + i], d = g - r;
        const m = Math.min(255, Math.abs(d) * 4);
        const cols = [[255 - r, 255 - r, 255 - r], [255 - g, 255 - g, 255 - g], d > 0 ? [255, 255 - m, 255 - m] : d < 0 ? [255 - m, 255 - m, 255] : [255, 255, 255]];
        cols.forEach(([R, Gc, B], col) => {
          const x0 = G + col * (cw + G);
          for (let yy = 0; yy < Z; yy++) for (let xx = 0; xx < Z; xx++) put(x0 + i * Z + xx, y0 + j * Z + yy, R, Gc, B);
        });
      }
    // Centre tick (yellow) in the difference column.
    const xc = G + 2 * (cw + G) + (c.z * Z) / 2, yc = y0 + (c.z * Z) / 2;
    for (let q = -6; q <= 6; q++) { put(xc + q, yc, 230, 190, 0); put(xc, yc + q, 230, 190, 0); }
  });
  writeFileSync(file, png(w, h, rgb));
}

const bundle = await rolldown({ input: join(here, "page.ts"), platform: "browser", logLevel: "warn" });
await bundle.write({ file: join(outDir, "page.js"), format: "iife", inlineDynamicImports: true });
await bundle.close();
writeFileSync(
  join(outDir, "page.html"),
  '<!doctype html>\n<html><head><meta charset="utf-8"><title>K1040 S4a band pass</title><link rel="icon" href="data:,"></head>\n<body style="margin:0;background:#151b28"><script src="page.js"></script></body></html>\n',
);

const profile = join(here, `.profile-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profile,
  protocolTimeout: 30 * 60 * 1000,
  defaultViewport: { width: 640, height: 400 },
  args: [
    "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=700,500",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
const errors = [];
let favicon = 0;
const isFav = (u) => /favicon/i.test(u ?? "");
const stamp = new Date().toISOString();
const sha = execSync("git rev-parse --short HEAD", { cwd: worktree }).toString().trim();
const dirty = execSync("git status --porcelain src", { cwd: worktree }).toString().trim() ? "+" : "";
const summary = [`# ${pre} ${stamp} (${sha}${dirty})`, "", `scale ${scale}${mode === "time" ? `, frames ${frames} x rounds ${rounds} per arm` : ""}`, ""];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const loc = m.location()?.url ?? "";
    if (isFav(loc) || isFav(m.text())) favicon++;
    else errors.push(`console: ${m.text()}`);
  });
  page.on("requestfailed", (r) => (isFav(r.url()) ? favicon++ : errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`)));
  page.on("response", (r) => {
    if (r.status() < 400) return;
    if (isFav(r.url())) favicon++;
    else errors.push(`http ${r.status()}: ${r.url()}`);
  });
  await page.goto(pathToFileURL(join(outDir, "page.html")).href);
  await page.waitForFunction(() => !!window.s4a, { timeout: 15000 });
  for (const name of scenes) {
    const scene = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8"));
    scene.name = name;
    const t0 = Date.now();
    if (mode === "time") {
      const r = await page.evaluate((s, o) => window.s4a.time(s, o), scene, { scale, frames, rounds, fit });
      r.scene = name;
      writeFileSync(join(outDir, `${pre}_${name}.json`), JSON.stringify(r, null, 1));
      const line = `- ${name}: ${r.W}x${r.H}, render sync p50/p95 ms: label ${r.label.p50.toFixed(3)}/${r.label.p95.toFixed(3)}, label+band ${r.band.p50.toFixed(3)}/${r.band.p95.toFixed(3)} (band +${(r.band.p50 - r.label.p50).toFixed(3)}); strips ${r.strips}; prep label ${r.prepLabelMs.toFixed(2)} band ${r.prepBandMs.toFixed(2)} ms; lost ${r.lost}`;
      summary.push(line);
      console.log(line);
      continue;
    }
    if (mode === "diag") {
      // The previous check's worst spots and mismatches, pixel by pixel.
      const prev = JSON.parse(readFileSync(join(outDir, `check_${name}.json`), "utf8"));
      const n = Number(val("--n", 6));
      const spots = [...prev.worst.slice(0, n), ...prev.mis.slice(0, n)].map((q) => ({ u: q.u, v: q.v, chain: q.chain, k: q.k, side: q.side }));
      const r = await page.evaluate((s, o) => window.s4a.diag(s, o), scene, { scale, spots, tol: Number(val("--tol", 8)) });
      writeFileSync(join(outDir, `diag_${name}.json`), JSON.stringify(r, null, 1));
      for (const q of r) {
        console.log(`spot dev (${q.spot.u.toFixed(1)}, ${q.spot.v.toFixed(1)}) chain ${q.spot.chain} k ${q.spot.k} side ${q.spot.side}`);
        for (const row of q.rows) console.log("  " + JSON.stringify(row));
      }
      continue;
    }
    const r = await page.evaluate((s, o) => window.s4a.check(s, o), scene, { scale, keep: 12 });
    r.scene = name;
    const w = r.worst[0];
    const line = `- ${name}: ${r.W}x${r.H}, ppd ${r.ppd.toFixed(3)}; sections ${r.n} (inked ${r.inked}, skipped near corners ${r.skipped}); worst dF ${w ? w.dF.toFixed(4) : "-"} px at dev (${w ? `${w.u.toFixed(1)}, ${w.v.toFixed(1)}` : "-"}) chain ${w?.chain} k ${w?.k} side ${w?.side}; > 1/32: ${r.over}, > 1/8: ${r.over8}, > 1/2: ${r.over2}; run-count mismatches ${r.mism}; strips ${r.strips}, windows ${r.windows} (max/group ${r.maxGroupWin}, max segs ${r.maxWinSegs}); lost ${r.lost}; ${Date.now() - t0} ms`;
    summary.push(line);
    console.log(line);
    for (const m of r.mis.slice(0, 4)) {
      const l2 = `  - mismatch at dev (${m.u.toFixed(1)}, ${m.v.toFixed(1)}) chain ${m.chain} k ${m.k} side ${m.side}: gpu ${JSON.stringify(m.gpu.map((q) => q.map((t) => +(t * r.ppd).toFixed(3))))} ref ${JSON.stringify(m.ref.map((q) => q.map((t) => +(t * r.ppd).toFixed(3))))} (px)`;
      summary.push(l2);
    }
    writeFileSync(join(outDir, `${pre}_${name}.json`), JSON.stringify(r, null, 1));
    // Sheets: junction sites, then the worst spots and mismatches.
    const js = await page.evaluate((s, o) => window.s4a.junctionSites(s, o), scene, { scale, n: 6 });
    const z = js.length ? js[0][2] : Math.max(48, Math.min(128, Math.ceil(7 * r.h * r.ppd)));
    const ws = [...r.worst.filter((q) => q.dF > 1 / 32).slice(0, 8), ...r.mis.slice(0, 4)].map((q) => [q.u, q.v, z]);
    const cr = await page.evaluate((s, o) => window.s4a.crops(s, o), scene, { scale, sites: [...js, ...ws] });
    sheet(join(sheetDir, `${name}_junctions.png`), cr.slice(0, js.length));
    sheet(join(sheetDir, `${name}_worst.png`), cr.slice(js.length));
  }
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
}
summary.push("", `renderer errors: ${errors.length} (favicon requests filtered: ${favicon})`, ...errors.slice(0, 20).map((e) => `- ${e}`), "");
appendFileSync(join(outDir, `${pre}_summary.md`), summary.join("\n") + "\n");
console.log(`errors ${errors.length}, favicon ${favicon}`);
for (const e of errors.slice(0, 10)) console.log(e);
