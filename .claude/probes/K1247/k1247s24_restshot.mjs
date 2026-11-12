// K1247 s24: the app's paint at rest for an off | on A/B, canvas only: each link in one headed real-GPU Chrome
// (the bench's flags), waited until asleep and the outline settled, every DOM element but the canvases hidden
// (the panel's open state and the stamp differ between loads), then a screenshot. phy=0 links hold one layout.
// Run under the perf lock (k1247s24_rest.ps1 -Shot), then k1247s20_appdiff.mjs on the two PNGs.
//   node .claude/probes/K1247/k1247s24_restshot.mjs <out1.png> <url1> [<out2.png> <url2> ...]
import puppeteer from "puppeteer-core";
import { rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const args = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "k1247s24-rest-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=1720,1060"],
});
try {
  for (let i = 0; i + 1 < args.length; i += 2) {
    const [out, url] = [args[i], args[i + 1]];
    const page = await browser.newPage();
    let lost = 0; const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.bringToFront();
    await page.mouse.move(1, 1);
    await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000 });
    await page.waitForFunction(() => { const o = window.__knotOutline; const p = window.__knotPerf?.(); return (p?.asleep ?? false) && (!o || (o.stats.replies > 0 && o.settled)); }, { timeout: 120000, polling: 250 }).catch(() => {});
    lost = await page.evaluate(() => { let n = 0; for (const c of document.querySelectorAll("canvas")) c.addEventListener("webglcontextlost", () => { n++; }); return n; });
    await page.addStyleTag({ content: "* { visibility: hidden !important; } canvas { visibility: visible !important; }" });
    await page.evaluate(() => window.__knotLoop?.({ continuous: true }));
    await sleep(1500);
    const st = await page.evaluate(() => { const o = window.__knotOutline; return o ? { bandRec: o.stats.bandRec, replies: o.stats.replies, settled: o.settled } : null; });
    await page.screenshot({ path: out });
    console.log(JSON.stringify({ out, url, st, errors, lost }));
    await page.close();
  }
} finally {
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* the profile may still be locked */ }
}
