// K1482: plain timed screenshots of a link (no freeze), to see what a page settles to.
//   node snap.mjs <base> <outDir> <profileDir> <query> [secs=5,15,30]
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
const [, , base, outDir, profileDir, query, secs = "5,15,30"] = process.argv;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${base}/?${query}`, { waitUntil: "load", timeout: 900000 });
  await page.bringToFront();
  const t0 = Date.now();
  for (const s of secs.split(",").map(Number)) {
    await sleep(Math.max(0, s * 1000 - (Date.now() - t0)));
    const info = await page.evaluate(() => { const r = window.__knotRenderer?.(); return { look: r?.threadLook, paint: r?.paintClock, state: window.__knotPerf?.()?.state }; });
    console.log(s, JSON.stringify(info));
    await page.screenshot({ path: join(outDir, `snap_${s}.png`) });
  }
} finally { await browser.close(); }
