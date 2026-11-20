// K1530 diag: on ONE frozen page, snapshot scalar render state + screenshot, repeat.
// Which scalar fields move between shots?  node diag.mjs <base> <outDir> <profile> <mode> <query> [pin]
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
const [, , base, outDir, profileDir, mode, query, pin] = process.argv;
const gf = mode === "gf";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1700,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-gpu-watchdog"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log(`pageerror ${e.message.slice(0, 160)}`));
await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await page.goto(`${base}/?${query}&phw=0&snd=none&prp=off${gf ? "&rp=gf" : ""}`, { waitUntil: "load", timeout: 900000 });
await page.bringToFront();
await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
if (gf) await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
const f0 = await page.evaluate(() => window.__knotLoop().frames);
await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 300 }, f0);
await alignFreezeParity(page, 20);
const h = await page.evaluate(async (pinMode) => {
  await window.__knotStepUntil(20);
  if (pinMode === "full") { window.__knotPinClocks(100); }
  else if (pinMode === "flow") { const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; r.flowSpeed = 0; }
  else if (pinMode === "wrap") { const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; const tp = r.tickPaint.bind(r); r.tickPaint = () => tp(0); }
  else if (pinMode === "tick") { const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; r.tickPaint(0); r.tickPaint = () => {}; }
  else { const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; }
  window.__knotLoop?.({ continuous: true });
  const d = await window.__knotPhysDump(); const hh = d?.hashes ?? d; return String(hh?.all ?? "");
}, pin ?? "cap");
console.log("hash", h);
await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
await page.mouse.move(2, 2); await sleep(800);
function snapExpr() {
  const walk = (o, pre, out, depth) => {
    if (!o || depth < 0) return;
    for (const k of Object.keys(o)) {
      let v; try { v = o[k]; } catch { continue; }
      const p = pre ? pre + "." + k : k;
      if (typeof v === "number" || typeof v === "boolean") out[p] = v;
      else if (v && typeof v === "object" && depth > 0 && !Array.isArray(v) && !(v instanceof Float32Array)) walk(v, p, out, depth - 1);
    }
  };
  const out = {};
  walk(window.__knotRenderer(), "r", out, 1);
  walk(window.__knotFabricRenderer(), "F", out, 1);
  const ps = window.__knotPS(); out["ps.simTime"] = ps?.simTime; out["frames"] = window.__knotLoop().frames;
  const g = globalThis.__knotGf; out["gf.composites"] = g?.stats?.composites; out["gf.workerBuilds"] = g?.stats?.workerBuilds; out["gf.threadBuilds"] = g?.stats?.threadBuilds;
  return out;
}
let prev = null;
for (let i = 0; i < 5; i++) {
  if (gf) {
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw?.(); return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 900000, polling: 200 }, c0);
  } else {
    const f = await page.evaluate(() => window.__knotLoop().frames);
    await page.waitForFunction((x) => window.__knotLoop().frames > x + 10, { timeout: 900000, polling: 200 }, f);
  }
  await sleep(500);
  const s = await page.evaluate(snapExpr);
  const buf = await page.screenshot();
  writeFileSync(join(outDir, `diag_${mode}_${i}.png`), buf);
  if (prev) {
    const changed = Object.keys(s).filter((k) => JSON.stringify(s[k]) !== JSON.stringify(prev[k])).map((k) => `${k}: ${prev[k]} -> ${s[k]}`);
    console.log(`shot${i} changed fields (${changed.length}):`, changed.slice(0, 40).join(" | "));
  } else console.log(`shot0 fields ${Object.keys(s).length}`);
  prev = s;
}
await browser.close();
console.log("done");
