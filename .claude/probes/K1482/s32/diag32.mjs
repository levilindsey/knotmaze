import puppeteer from "puppeteer-core";
const [, , url, prof] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 600000,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=1660,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`[${m.type()}] ${m.text().slice(0, 400)}`); });
page.on("pageerror", (e) => console.log("pageerror " + e.message.slice(0, 300)));
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "load", timeout: 300000 });
const T0 = Date.now();
for (let i = 0; i < 14; i++) {
  await sleep(5000);
  const s = await page.evaluate(() => { const g = globalThis.__knotGf; return JSON.stringify({ comp: g?.stats?.composites, sw: g?.stats?.switchedMs, lost: window.__lost, frames: window.__knotLoop?.().frames, st: window.__knotPerf?.()?.state, keys: g ? Object.keys(g.stats ?? {}).slice(0, 30) : null }); });
  console.log(((Date.now() - T0) / 1000).toFixed(0) + "s " + s);
  if (i === 6) await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf?.redraw(); });
}
await browser.close();
