// Run 26Z (K1223) Done 3: one aligned frozen state per load (fade.mjs's recipe + K1475 parity
// alignment), one screenshot. No hash-retry lottery: alignFreezeParity lands every load on the
// target substep, so base and new builds of one link freeze on the same state in one load each.
// K1544 (27I): pin through __knotPinClocks and normalize renderer.flowTime to 0 after the pin;
// the previous manual pin left tickPaint's flow clock at a load-dependent phase.
//   node .claude/probes/K1223/k1223_cap.mjs <base> <outPng> <profileDir> <query> [SIMT=20]
//   env DSF=2
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
import { waitViewStill } from "../view_still.mjs";
const [, , base, outPng, profileDir, query, simtArg = "20"] = process.argv;
const SIMT = +simtArg, DSF = +(process.env.DSF ?? 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(dirname(outPng), { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  const gf = query.includes("rp=gf");
  const t0 = Date.now();
  await page.goto(`${base}/?${query}&phw=0&snd=none`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (gf) await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
  if (process.env.ASLEEP) {
    await page.waitForFunction(() => window.__knotPerf?.()?.asleep === true, { timeout: 300000, polling: 300 });
  }
  await alignFreezeParity(page, SIMT);
  const hash = await page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    if (t >= 0) await window.__knotStepUntil(t);
    const pinned = window.__knotPinClocks ? window.__knotPinClocks(100) : false;
    const r = window.__knotRenderer();
    if (!pinned) { r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; }
    r.flowTime = 0;
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
  }, process.env.ASLEEP ? -1 : SIMT);
  await sleep(2500);
  if (gf) {
    for (let k = 0; k < 3; k++) {
      const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw(); return globalThis.__knotGf.stats.composites; });
      await page.waitForFunction((c) => (globalThis.__knotGf?.stats?.composites ?? 0) > c + 2, { timeout: 60000, polling: 100 }, c0);
      await sleep(600);
    }
  }
  const view = await waitViewStill(page);
  writeFileSync(outPng, await page.screenshot({ type: "png" }));
  console.log(`cap ${outPng} ready ${Date.now() - t0} ms hash ${hash} view ${view ? "settled" : "UNSETTLED"}`);
} finally { await browser.close(); }
