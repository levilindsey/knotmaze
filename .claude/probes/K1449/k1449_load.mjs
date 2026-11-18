// K1449: why the bench's first page never left "loading": load one link headed (the bench's Chrome flags), poll
// __knotPerf().state for 90 s, print page errors and console errors.  node k1449_load.mjs <url>
import puppeteer from "puppeteer-core";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const url = process.argv[2];
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: mkdtempSync(join(tmpdir(), "k1449load-")), defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("pageerror", String(e.message).slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("console", m.type(), m.text().slice(0, 300)); });
await page.goto(url, { waitUntil: "load", timeout: 60000 });
const t0 = Date.now();
for (let i = 0; i < 18; i++) {
  const s = await page.evaluate(() => { const p = window.__knotPerf?.(); return { state: p?.state, hasPerf: !!window.__knotPerf, gf: !!window.__knotGf, stamp: document.title }; });
  console.log(((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(s));
  if (s.state && s.state !== "loading") break;
  await new Promise((r) => setTimeout(r, 5000));
}
await browser.close();