// K1436 s2: GPU captures of rp=gf for the screen scan (k1436_screen_scan.ts reads them). One frozen physics state per
// job (the K868 recipe: load, freeze, __knotStepUntil(t), clocks pinned), then from the SAME page, after gf switched in
// (__knotGf.stats.switchedMs > 0) and recomposited:
//   fill.png   - threadLook 0 (fill): the section colour over coverage (cs=mono: one colour), gap cut included
//   border.png - threadLook 1 (border) with borderColor white: the stroke over the ink band, interior clear
//   meta.json  - __knotView, dpr, the physics hash, gap / fade (gf_look lookGap / lookFade inputs) and the page's
//                own GfTables (__knotGf.tables, typed arrays tagged), so the mirror labels come from the same geometry
//
//   node .claude/probes/K1436/k1436_screen.mjs <base> <outDir> <profileDir> <jobs.json> [par=3]
//     jobs.json: [{ name, query, t, w, h, today? }] (query without "?", rp=gf etc. included); env DSF=3 TRIES=4
//   K1436 s3 additions:
//     WARM=1      load each job's link, wait for gf's switch, its composites to rise and 20 frames, close: no capture
//                 (a profile is warm only for the links it has loaded; run this once per build before timing)
//     NOWD=1      launch Chrome with --disable-gpu-watchdog (builds before fc520c2d / K1468 hang the GPU on a cold load)
//     job.today   capture TODAY's renderer (the query carries no rp=gf): no gf waits, meta without GfTables; the same
//                 frozen K868 state, so the work list's crops show today | gf at one device pixel
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
const [, , base, outDir, profileDir, jobsPath, parS = "3"] = process.argv;
const DSF = +(process.env.DSF ?? 3), TRIES = +(process.env.TRIES ?? 4), WARM = process.env.WARM === "1";
const jobs = JSON.parse(readFileSync(jobsPath, "utf8"));
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1300,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    ...(process.env.NOWD === "1" ? ["--disable-gpu-watchdog"] : [])],
});
async function redrawToday(page) {
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f) => window.__knotLoop().frames > f + 6, { timeout: 900000, polling: 200 }, f0);
  await sleep(500);
}
async function redraw(page, job) {
  if (job?.today) return redrawToday(page);
  const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw(); return globalThis.__knotGf.stats.composites; });
  await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 900000, polling: 200 }, c0);
  await sleep(500);
}
// s3: a hard cap per load (JOBMS, default 8 min): a page whose renderer hangs (a stalled GPU process under load; the
// warm pass saw pages that did not answer Network.enable after 11 min) is closed and retried. Closes only ITS page
// (s2 closed every page, which killed the other parallel jobs' loads too).
const JOBMS = +(process.env.JOBMS ?? 480000);
async function once(job) {
  const h = {}; let tm;
  try { return await Promise.race([once1(job, h), new Promise((_, j) => { tm = setTimeout(() => j(new Error(`load over ${JOBMS} ms`)), JOBMS); })]); }
  catch (e) { console.log(`[${job.name}] ${e.message.slice(0, 160)}`); if (h.page) await Promise.race([h.page.close().catch(() => {}), sleep(15000)]); return { hash: "error", meta: { lost: 1 }, ms: 0 }; }
  finally { clearTimeout(tm); }
}
async function once1(job, h = {}) {
  const page = await browser.newPage(); h.page = page;
  page.on("pageerror", (e) => console.log(`[${job.name}] pageerror ${e.message}`));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__lost = 0; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (...a) { if (!this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => { if (this.isConnected) window.__lost++; }); } return gc.apply(this, a); }; });
  await page.setViewport({ width: job.w ?? 1240, height: job.h ?? 900, deviceScaleFactor: DSF });
  const t0 = Date.now();
  await page.goto(`${base}/?${job.query}`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (!job.today) await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
  // after the switch gf compiles its other programs: frames stall for ~1-2 min (cold) before they flow again
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 500 }, f0);
  if (WARM) {
    // the border look's programs too: a capture flips threadLook, so warm both looks
    if (!job.today) for (const look of [1, 0]) { await page.evaluate((l) => { const r = window.__knotRenderer(); r.threadLook = l; }, look); await redraw(page, job); }
    const lost = await page.evaluate(() => window.__lost); await page.close();
    return { hash: "warm", meta: { lost }, ms: Date.now() - t0, warm: true };
  }
  const hash = await page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    const r = window.__knotRenderer();
    r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
  }, (job.t ?? 40) - 0.008); // K868 stepped to 40 and landed on the frame at 40.0167 (40.0083): step to just under it
  // DOM chrome off the capture (chips, buttons, HUD, a closed panel's menu): only the canvas shows
  await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
  await sleep(2000);
  await page.evaluate(() => { const r = window.__knotRenderer(); r.threadLook = 0; });
  await redraw(page, job);
  const fill = await page.screenshot({ type: "png" });
  await page.evaluate(() => { const r = window.__knotRenderer(); r.threadLook = 1; r.borderColor = 0xffffff; });
  await redraw(page, job);
  const border = await page.screenshot({ type: "png" });
  const meta = await page.evaluate(() => {
    if (!globalThis.__knotGf) return { view: window.__knotView(), dpr: window.devicePixelRatio, w: innerWidth, h: innerHeight, today: 1, lost: window.__lost };
    const T = globalThis.__knotGf.tables; const o = {};
    for (const [k, v] of Object.entries(T)) {
      if (ArrayBuffer.isView(v)) o[k] = { __t: v.constructor.name, v: Array.from(v, (x) => (x === Infinity ? "Inf" : x === -Infinity ? "-Inf" : x !== x ? "NaN" : x)) };
      else o[k] = v;
    }
    const r = window.__knotRenderer();
    // s3: the renderer's marker placements (world centre, placed radius), so the scan masks them and the head's glow
    let markers; try { const M = window.__knotFabricRenderer?.()?.markers; if (M) markers = Object.entries(M).map(([role, m]) => ({ role, x: m.mesh.position.x, y: m.mesh.position.y, s: m.mesh.scale.x, vis: !!m.mesh.visible && !!m.mesh.parent })); } catch {}
    return { view: window.__knotView(), dpr: window.devicePixelRatio, w: innerWidth, h: innerHeight, markers,
      style: { casingWidth: r.style.casingWidth, threadWidth: r.style.threadWidth }, fadeLength: r.fadeLength,
      home: globalThis.__knotGf.home, switchedMs: globalThis.__knotGf.stats.switchedMs, lost: window.__lost, T: o };
  });
  await page.close();
  return { hash, fill, border, meta, ms: Date.now() - t0 };
}
async function run(job) {
  let got = null;
  for (let k = 0; k < TRIES; k++) {
    const P = await once(job);
    if (P.meta.lost) { console.log(`[${job.name}] webgl context lost (${P.meta.lost}), retry`); got = P; continue; }
    if (P.warm) { console.log(`[${job.name}] warm ${P.ms} ms`); return; }
    if (!job.hash || P.hash === job.hash) { got = P; break; }
    console.log(`[${job.name}] hash ${P.hash} != ${job.hash}, retry`); got = P;
  }
  if (!got?.fill) { console.log(`[${job.name}] NO CAPTURE`); return; }
  const d = join(outDir, job.name); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "fill.png"), got.fill); writeFileSync(join(d, "border.png"), got.border);
  writeFileSync(join(d, "meta.json"), JSON.stringify({ ...got.meta, hash: got.hash, job }));
  console.log(`[${job.name}] ${got.ms} ms hash ${got.hash}`);
}
const par = +parS; const q = [...jobs];
await Promise.all(Array.from({ length: par }, async () => { while (q.length) await run(q.shift()); }));
await browser.close();
