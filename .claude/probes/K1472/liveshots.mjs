// liveshots.mjs: unpinned frames of a link through its reveal, with gf's stats beside each.
// node liveshots.mjs <url> <profileDir> <outPrefix> [times=3,5,7,9,11,13,17]   (seconds after the load event)
import puppeteer from "puppeteer-core";
const [, , url, prof, out, times = "3,5,7,9,11,13,17"] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 600000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000"] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: "load", timeout: 600000 });
const t0 = Date.now();
for (const t of times.split(",").map(Number)) {
  await new Promise((r) => setTimeout(r, Math.max(0, t * 1000 - (Date.now() - t0))));
  const s = await p.evaluate(() => { const a = globalThis.__knotGf; return a ? { c: a.stats.composites, f: a.stats.fallback, i: a.stats.compileIssued, r: a.stats.compileReady } : null; });
  await p.screenshot({ path: `${out}_t${t}.png` });
  console.log(((Date.now() - t0) / 1000).toFixed(1), "t" + t, JSON.stringify(s));
}
await b.close();
