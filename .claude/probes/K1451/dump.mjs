// K1451: one ordinary load of a gf link; dump the gf tables (typed arrays tagged) and the view (root x, y, scale)
// to <out>.json, and a full shot to <out>.png. The tables feed GfEval in Node (k1451_ev.ts).
//   node dump.mjs <url> <out> <profileDir> [waitMs=8000]   env DSF=2
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , url, out, profileDir, waitMs = "8000"] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  if (process.env.GFOPTS) await page.evaluateOnNewDocument((o) => { globalThis.__knotGfOpts = JSON.parse(o); }, process.env.GFOPTS);
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: Number(process.env.DSF ?? 2) });
  await page.goto(url, { waitUntil: "load", timeout: 600000 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 600000, polling: 200 });
  await new Promise((r) => setTimeout(r, Number(waitMs)));
  if (process.env.FREEZE === "1") await page.evaluate(async () => { await window.__knotPhysFreeze?.(true); await new Promise((r) => setTimeout(r, 1500)); });
  const shot = await page.screenshot({ type: "png" });
  const res = await page.evaluate(() => {
    const T = globalThis.__knotGf.tables; const o = {};
    for (const [k, v] of Object.entries(T)) {
      if (ArrayBuffer.isView(v)) o[k] = { t: v.constructor.name, d: Array.from(v, (x) => (x === Infinity ? "inf" : x === -Infinity ? "-inf" : x)) };
      else if (typeof v === "number" && !Number.isFinite(v)) o[k] = { t: "num", d: String(v) };
      else o[k] = v;
    }
    const v = window.__knotView(); const r = window.__knotRenderer?.();
    return { T: o, view: { x: v.x, y: v.y, s: v.s }, fade: r?.fadeLength, search: location.search, dpr: devicePixelRatio };
  });
  writeFileSync(`${out}.json`, JSON.stringify(res));
  writeFileSync(`${out}.png`, shot);
  console.log(JSON.stringify({ view: res.view, fade: res.fade, search: res.search, h: res.T.h, zt: res.T.zt, nC: res.T.nC }));
} finally { await browser.close(); }
