// K1530 (27A): two redraws of ONE frozen state - do they agree?
//   node repro.mjs <base> <outDir> <profileDir> <mode:gf|today> <query> <loads> <pin:cap|full|none>
// cap  = cap.mjs's pin (renderer paint clocks + background only)
// full = __knotPinClocks(100) (also pins the fabric explore clock)
// none = no pin after the freeze
// Each load: phw=0, alignFreezeParity, stepUntil(20), pin, shot A, dump, shot B, dump.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
const [, , base, outDir, profileDir, mode, query, loadsS, pin, pre] = process.argv;
const LOADS = Number(loadsS ?? 3);
const gf = mode === "gf";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1700,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-gpu-watchdog"],
});
const T0 = Date.now(); const T = () => ((Date.now() - T0) / 1000).toFixed(0) + "s";
async function load(q) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`pageerror ${e.message.slice(0, 160)}`));
  await page.evaluateOnNewDocument((pre) => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {}
    if (pre === "worker0") globalThis.__knotGfOpts = { worker: false };
    if (pre === "verify") globalThis.__knotGfOpts = { verify: true };
  }, pre ?? "");
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.goto(`${base}/?${q}&phw=0&snd=none&prp=off${gf ? "&rp=gf" : ""}`, { waitUntil: "load", timeout: 900000 });
  await page.bringToFront();
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (gf) await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 300 }, f0);
  return page;
}
async function dump(page, tag) {
  return page.evaluate((tag) => {
    const r = window.__knotRenderer(); const F = window.__knotFabricRenderer?.();
    const g = globalThis.__knotGf;
    return {
      tag, paintClock: r?.paintClock, pulseBorn: r?.pulseBorn, fadeLength: r?.fadeLength, threadLook: r?.threadLook,
      flowTime: r?.flowTime, flowStrength: r?.flowStrength,
      exploreClock: F ? F.exploreClock : null, startShown: F ? F.startShown : null,
      view: window.__knotView(), frames: window.__knotLoop().frames,
      composites: g?.stats?.composites ?? null, builds: g?.stats?.workerBuilds ?? null,
      verified: g?.stats?.verified ?? null, mismatch: g?.stats?.mismatch ?? null,
      worker: g?.stats?.worker ?? null, threadBuilds: g?.stats?.threadBuilds ?? null, stale: g?.stats?.stale ?? null, superseded: g?.stats?.superseded ?? null,
      bgClock: window.__knotBackgroundLayer?.()?.clock?.time ?? null,
    };
  }, tag);
}
async function redraw(page) {
  await page.evaluate(() => { const L = window.__knotBackgroundLayer?.(); if (L) { L.tick = () => false; L.clock.time = 40; if (L.active) L.renderTexture(); } });
  if (!gf) { const f0 = await page.evaluate(() => window.__knotLoop().frames); await page.waitForFunction((f) => window.__knotLoop().frames > f + 10, { timeout: 900000, polling: 200 }, f0); await sleep(500); return; }
  const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw?.(); return globalThis.__knotGf.stats.composites; });
  await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 900000, polling: 200 }, c0);
  await sleep(500);
}
const rows = [];
for (let i = 0; i < LOADS; i++) {
  const page = await load(query);
  await alignFreezeParity(page, 20);
  const h = await page.evaluate(async (pinMode) => {
    await window.__knotStepUntil(20);
    if (pinMode === "cap") { const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; window.__knotLoop?.({ continuous: true }); }
    else if (pinMode === "full") { window.__knotPinClocks(100); window.__knotLoop?.({ continuous: true }); }
    const d = await window.__knotPhysDump(); const hh = d?.hashes ?? d; return String(hh?.all ?? JSON.stringify(hh).slice(0, 80));
  }, pin);
  await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
  await page.mouse.move(2, 2); await sleep(800);
  const d0 = await dump(page, "pre");
  await redraw(page); await page.screenshot(); // warm x2: builds in flight at the pin (depth 2) still show pre-pin state (K1530)
  await redraw(page); await page.screenshot();
  await redraw(page); const a = await page.screenshot(); const dA = await dump(page, "A");
  await redraw(page); const b = await page.screenshot(); const dB = await dump(page, "B");
  const pa = join(outDir, `${mode}_${pin}_load${i}_a.png`), pb = join(outDir, `${mode}_${pin}_load${i}_b.png`);
  writeFileSync(pa, a); writeFileSync(pb, b);
  const eq = Buffer.compare(a, b) === 0;
  rows.push({ load: i, hash: h, byteEqual: eq, d0, dA, dB });
  console.log(T(), `load${i} hash=${h} byteEqual=${eq} flow pre=${d0.flowTime} A=${dA.flowTime} B=${dB.flowTime} explore A=${dA.exploreClock} B=${dB.exploreClock} comp A=${dA.composites} B=${dB.composites}`);
  await page.close();
}
writeFileSync(join(outDir, `${mode}_${pin}_dump.json`), JSON.stringify(rows, null, 1));
console.log(T(), "done", mode, pin, "hashes", [...new Set(rows.map((r) => r.hash))].join(","));
await browser.close();
