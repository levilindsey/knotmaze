// K1525 s1: same-state captures of one build, today's or rp=gf, physics AND background pinned.
// From K1495's shots.mjs (load, freeze, __knotStepUntil(SIMT), paint clocks pinned, fl set LIVE) plus K1451's
// background pin (tick off, clock 40, re-render) and K1519's byte-stable rule (two identical shots after a redraw).
//
//   node cap.mjs <base> <outDir> <profileDir> <jobs.json>
//     jobs.json: [{ name, query, rp: "gf"|"today", looks: [0 fill, 1 border], fls: [..], simT, hash, w, h, dsf, urlfl }]
//     urlfl: true sets fl by reload (&fl=<v> after the token) instead of live.
//   writes <outDir>/<name>/<f|b>_fl<v>.png and <outDir>/<name>/meta.json (view, hash, stamp, stable tries)
//   env WARM=1: load each job once (gf compile), no capture.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
const [, , base, outDir, profileDir, jobsPath] = process.argv;
const JOBS = JSON.parse(readFileSync(jobsPath, "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1700,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-gpu-watchdog"],
});
const T0 = Date.now(); const T = () => ((Date.now() - T0) / 1000).toFixed(0) + "s";
let lost = 0;
async function load(job, q) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`pageerror ${e.message.slice(0, 200)}`));
  page.on("console", (m) => { const t = m.text(); if (/webglcontextlost|CONTEXT_LOST/i.test(t)) { lost++; console.log("CONTEXT LOST", t.slice(0, 120)); } });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  await page.setViewport({ width: job.w ?? 1600, height: job.h ?? 900, deviceScaleFactor: job.dsf ?? 2 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  const gf = job.rp === "gf";
  await page.goto(`${base}/?${q}&phw=0&snd=none&prp=off${gf ? "&rp=gf" : ""}`, { waitUntil: "load", timeout: 900000 });
  await page.bringToFront();
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (gf) await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 300 }, f0);
  return page;
}
async function pinBg(page) {
  await page.evaluate(() => {
    const L = window.__knotBackgroundLayer?.();
    if (L) { L.tick = () => false; L.clock.time = 40; if (L.active) L.renderTexture(); }
  });
}
async function redraw(page, gf) {
  await pinBg(page);
  if (!gf) { const f0 = await page.evaluate(() => window.__knotLoop().frames); await page.waitForFunction((f) => window.__knotLoop().frames > f + 10, { timeout: 900000, polling: 200 }, f0); await sleep(500); return; }
  const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw?.(); return globalThis.__knotGf.stats.composites; });
  await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 900000, polling: 200 }, c0);
  await sleep(500);
}
async function freeze(page, t, par) {
  return page.evaluate(async (t, par) => {
    await window.__knotPhysFreeze(true);
    // K1519 (k1436_screen.mjs): __knotStepUntil steps 1/60 s frames (two 1/120 substeps), so a live state of the other
    // substep parity overshoots by one substep. par (0/1) is the wanted substep parity: credit the accumulator one
    // substep when the live count has the other.
    if (par === 0 || par === 1) {
      try { const ps = window.__knotPS(); if (Math.round(ps.simTime * 120) % 2 !== par) ps.accumulator = (ps.accumulator ?? 0) + 1 / 120; } catch {}
    }
    await window.__knotStepUntil(t);
    window.__capSim = window.__knotPS?.()?.simTime;
    const r = window.__knotRenderer();
    r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
  }, t, par);
}
async function stableShot(page, gf, path) {
  let prev = null; let prev2 = null;
  for (let k = 0; k < 6; k++) {
    await redraw(page, gf);
    const buf = await page.screenshot();
    if (prev && Buffer.compare(prev, buf) === 0) { writeFileSync(path, buf); return k; }
    prev2 = prev; prev = buf;
  }
  writeFileSync(path, prev); if (prev2) writeFileSync(path.replace(/\.png$/, ".alt.png"), prev2);
  console.log(T(), `UNSTABLE ${path}`); return -1;
}
async function prep(page) {
  await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
  await page.mouse.move(2, 2);
  await sleep(800);
}
for (const job of JOBS) {
  const dir = join(outDir, job.name); mkdirSync(dir, { recursive: true });
  const gf = job.rp === "gf";
  if (process.env.WARM === "1") { const p = await load(job, job.query); console.log(T(), job.name, "warm ok"); await p.close(); continue; }
  const meta = { job, shots: {} };
  const fls = job.fls ?? [0, 0.14, 0.5, 1.2];
  const looks = job.looks ?? [0];
  const runOne = async (q, onShot) => {
    for (let k = 0; k < (job.tries ?? 6); k++) {
      const page = await load(job, q);
      const h = await freeze(page, job.simT ?? 20, job.par);
      meta.sim = await page.evaluate(() => window.__capSim); console.log(T(), job.name, 'sim', meta.sim, h);
      if (job.hash && h !== job.hash) { console.log(T(), job.name, `hash ${h} != ${job.hash}, reload`); await page.close(); continue; }
      meta.hash = h;
      await prep(page);
      await onShot(page);
      meta.view = await page.evaluate(() => window.__knotView());
      meta.stamp = await page.evaluate(() => document.title + " " + JSON.stringify(window.__knotBuild?.() ?? ""));
      meta.fadeLength = await page.evaluate(() => window.__knotRenderer().fadeLength);
      await page.close(); return true;
    }
    console.log(T(), job.name, "NO HASH MATCH"); return false;
  };
  if (job.urlfl) {
    for (const v of fls) {
      await runOne(`${job.query}&fl=${v}`, async (page) => {
        for (const lk of looks) {
          await page.evaluate((v) => { window.__knotRenderer().threadLook = v; }, lk);
          const p = join(dir, `${lk === 1 ? "b" : "f"}_fl${v}.png`);
          meta.shots[p] = await stableShot(page, gf, p);
        }
      });
    }
  } else {
    await runOne(job.query, async (page) => {
      for (const lk of looks) {
        await page.evaluate((v) => { window.__knotRenderer().threadLook = v; }, lk);
        for (const v of fls) {
          await page.evaluate((v) => { window.__knotRenderer().fadeLength = v; }, v);
          await sleep(300);
          const p = join(dir, `${lk === 1 ? "b" : "f"}_fl${v}.png`);
          meta.shots[p] = await stableShot(page, gf, p);
          // debug build only: the experimental look fixes (uLkFix bits), same page and state
          for (const fx of job.fix ?? []) {
            await page.evaluate((m) => { globalThis.__knotGfLkFix = m; }, fx);
            const px = join(dir, `${lk === 1 ? "b" : "f"}x${fx}_fl${v}.png`);
            meta.shots[px] = await stableShot(page, gf, px);
            await page.evaluate(() => { globalThis.__knotGfLkFix = 0; });
          }
          // debug build only (dbg.patch): the look's terms as colours, one picture per mode
          if (lk === 0) for (const m of job.dbg ?? []) {
            await page.evaluate((m) => { globalThis.__knotGfLkDbg = m; }, m);
            const pd = join(dir, `d${m}_fl${v}.png`);
            meta.shots[pd] = await stableShot(page, gf, pd);
            await page.evaluate(() => { globalThis.__knotGfLkDbg = 0; });
          }
        }
      }
    });
  }
  writeFileSync(join(dir, "meta.json"), JSON.stringify(meta, null, 1));
  console.log(T(), job.name, `hash ${meta.hash}`, JSON.stringify(Object.values(meta.shots)), meta.stamp?.slice(0, 100));
}
await browser.close();
console.log(T(), "done", "contextLost", lost);
