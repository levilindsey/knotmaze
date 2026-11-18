// K1436 s2 debug: load one job and print gf's state at each capture step.
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
const [, , base, profileDir, jobsPath] = process.argv;
const job = JSON.parse(readFileSync(jobsPath, "utf8"))[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=1300,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.stack?.slice(0, 600)));
page.on("console", (m) => { const t = m.text(); if (/gf|error|fail/i.test(t)) console.log("console", t.slice(0, 200)); });
await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__lost = 0; const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (...a) { if (!this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => { if (this.isConnected) window.__lost++; }); } return gc.apply(this, a); }; });
await page.setViewport({ width: 1240, height: 900, deviceScaleFactor: +(process.env.DSF ?? 3) });
await page.goto(`${base}/?${job.query}`, { waitUntil: "load" });
const st = () => page.evaluate(() => { const g = globalThis.__knotGf; return JSON.stringify({ has: !!g, comp: g?.stats?.composites, sw: g?.stats?.switchedMs, fb: g?.stats?.fallback, perf: window.__knotPerf?.()?.state, loop: window.__knotLoop?.()?.mode, frames: window.__knotLoop?.()?.frames, lost: window.__lost }); });
for (let k = 0; k < 60; k++) { const s = await st(); console.log(k * 3, s); if (JSON.parse(s).sw > 0) break; await sleep(3000); }
console.log("freeze", await page.evaluate(async (t) => { await window.__knotPhysFreeze(true); await window.__knotStepUntil(t); return 1; }, job.t));
for (let k = 0; k < 4; k++) { console.log("after step", await st()); await sleep(1000); }
await page.evaluate(() => { const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; window.__knotLoop?.({ continuous: true }); });
for (let k = 0; k < 4; k++) { console.log("after pin", await st()); await sleep(1000); }
await page.evaluate(() => { globalThis.__knotGf?.redraw(); });
for (let k = 0; k < 30; k++) { const s = await st(); console.log("after redraw", k * 3, s); if (JSON.parse(s).comp > 6) break; await sleep(3000); }
await browser.close();
