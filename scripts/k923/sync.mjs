// K923: K892's render-sync measure on the bench page. Per URL, in a fresh
// tab: wait for the page's ready flag, then window.__k923RenderLoop(iter) =
// iter back-to-back renders of the variant, each ended by a 1-px readPixels
// (cannot return before the GPU is done), inside one task, after 10 warm-up
// renders (scripts/phone_pass/walk.mjs renderLoop's method). ABBA rounds.
//   node scripts/k923/sync.mjs --target desk|phone [--cells muse_fit,g41_fit,muse_6x,g41_6x]
//        [--variants floor,label,band,both,search,both~step=4] [--rounds 2] [--iter 60] [--iter6s 20]
//        [--extra "&lr=2"] [--tag _x] [--port 5923] [--cdp http://127.0.0.1:9222]
// desk: own temp Chrome profile, off-screen headed window, ANGLE d3d11, 411x753 @2.
// phone: needs serve.mjs, adb reverse of --port, the 9222 forward, Chrome in front.
// Writes sync_<target><tag>.json next to this file and prints a table.
import puppeteer from "puppeteer-core";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const opt = { target: "desk", cells: "muse_fit,g41_fit,muse_6x,g41_6x", variants: "floor,label,band,both,search", rounds: 2, iter: 60, iter6s: 20, extra: "", tag: "", port: 5923, cdp: "http://127.0.0.1:9222" };
const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) { const k = av[i].replace(/^--/, ""); opt[k] = typeof opt[k] === "number" ? Number(av[++i]) : av[++i]; }
const Q = { muse_fit: "scene=muse_hash&z=1", muse_6x: "scene=muse_hash&z=6", g41_fit: "scene=g41_def_tw64&z=1", g41_6x: "scene=g41_def_tw64&z=6",
  muse_2x: "scene=muse_hash&z=2", muse_3x: "scene=muse_hash&z=3", g41_2x: "scene=g41_def_tw64&z=2", g41_3x: "scene=g41_def_tw64&z=3" };
const host = opt.target === "phone" ? "localhost" : "127.0.0.1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser, profile = null;
if (opt.target === "phone") browser = await puppeteer.connect({ browserURL: opt.cdp, defaultViewport: null });
else {
  profile = mkdtempSync(join(tmpdir(), "k923-sync-"));
  browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: false, userDataDir: profile, defaultViewport: { width: 411, height: 753, deviceScaleFactor: 2 },
    args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
      "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
      "--window-size=560,940"],
  });
}
const runs = [];
let caps = null;
try {
  for (const cell of opt.cells.split(",")) {
    const vs = opt.variants.split(",");
    for (let round = 0; round < opt.rounds; round++) {
      for (const v of (round % 2 ? [...vs].reverse() : vs)) {
        // A variant item may carry its own keys: "both~step=4~lr=2".
        const [vb, ...ex] = v.split("~");
        const url = `http://${host}:${opt.port}/K923/bench.html?${Q[cell]}&v=${vb}${ex.length ? "&" + ex.join("&") : ""}${opt.extra}`;
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e.message || e).slice(0, 200)));
        await page.goto(url, { waitUntil: "load", timeout: 120000 });
        await page.bringToFront();
        await page.waitForFunction(() => window.__k923Error || (window.__knotPerf && window.__knotPerf().asleep), { timeout: 120000, polling: 250 });
        if (!caps) caps = await page.evaluate(() => { const gl = document.getElementById("c").getContext("webgl2"); const d = gl.getExtension("WEBGL_debug_renderer_info"); return { renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), dpr: devicePixelRatio, vp: `${innerWidth}x${innerHeight}`, ua: navigator.userAgent }; });
        await sleep(1000);
        const n = /search/.test(vb) && /z=6/.test(Q[cell]) ? opt.iter6s : opt.iter;
        const t0 = Date.now();
        const r = await page.evaluate((k) => (window.__k923RenderLoop ? window.__k923RenderLoop(k) : { error: window.__k923Error || "no loop" }), n);
        const stamp = await page.evaluate(() => document.getElementById("stamp").textContent);
        runs.push({ cell, v, round, url, stamp, wallMs: Date.now() - t0, ...r, errors });
        console.log(`${new Date().toTimeString().slice(0, 8)} ${cell} ${v} r${round}: median ${r.median} p95 ${r.p95} (n ${r.n}, lost ${r.lost})`);
        await page.close();
      }
    }
  }
} finally {
  if (profile) { await browser.close(); rmSync(profile, { recursive: true, force: true }); } else await browser.disconnect();
}
const table = [];
for (const cell of opt.cells.split(",")) {
  const by = (v) => runs.filter((x) => x.cell === cell && x.v === v);
  const m = (a, f) => { const b = a.map(f).filter(Number.isFinite); return b.length ? b.reduce((x, y) => x + y, 0) / b.length : NaN; };
  const fl = by("floor");
  const f50 = m(fl, (x) => x.median), f95 = m(fl, (x) => x.p95);
  for (const v of opt.variants.split(",")) {
    const rs = by(v), md = m(rs, (x) => x.median), p95 = m(rs, (x) => x.p95);
    table.push({ cell, v, median: +md.toFixed(2), p95: +p95.toFixed(2), dMedian: +(md - f50).toFixed(2), dP95: +(p95 - f95).toFixed(2), rounds: rs.map((x) => x.median).join("/"), lost: rs.reduce((s, x) => s + (x.lost || 0), 0), errors: rs.flatMap((x) => x.errors).length });
  }
}
writeFileSync(join(here, `sync_${opt.target}${opt.tag}.json`), JSON.stringify({ when: new Date().toISOString(), opt, caps, table, runs }, null, 1));
console.log(`caps ${JSON.stringify(caps)}`);
console.log("| cell | v | median | p95 | median-floor | p95-floor | rounds' medians | lost | err |\n|---|---|---|---|---|---|---|---|---|");
for (const t of table) console.log(`| ${t.cell} | ${t.v} | ${t.median} | ${t.p95} | ${t.dMedian} | ${t.dP95} | ${t.rounds} | ${t.lost} | ${t.errors} |`);
