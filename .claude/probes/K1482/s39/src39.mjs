// K1482 s39 item 6: the program-source record (window.__srcs, as cap34.mjs's COST line) of ONE load of link A, polled
// every 5 s until it stops growing (no change for 25 s) or CAP seconds (default 120) after the first gf composite.
//   node src39.mjs <base> <profileDir> [query]   env CAP=120
// Prints "t=<s since first composite> n=<sources> chars=<total> passes=<n>" per poll, then "FINAL n chars" and the sizes.
import puppeteer from "puppeteer-core";
const [, , base, profileDir, query = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&bgs=0"] = process.argv;
const CAP = +(process.env.CAP ?? 120);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { window.__srcs = []; if (typeof WebGL2RenderingContext === "undefined" || window.__srcHooked) return; window.__srcHooked = 1; const ss = WebGL2RenderingContext.prototype.shaderSource; WebGL2RenderingContext.prototype.shaderSource = function (sh, src) { if (src.includes("#define MAXP")) window.__srcs.push({ n: src.length, t: Math.round(performance.now()) }); return ss.call(this, sh, src); }; });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${base}/?${query}&phw=0&snd=none&prp=off&rp=gf`, { waitUntil: "load", timeout: 900000 });
  await page.bringToFront();
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 240000, polling: 300 });
  const REC = () => { const S = window.__srcs ?? []; return JSON.stringify({ n: S.length, chars: S.reduce((s, x) => s + x.n, 0), passes: globalThis.__knotGf?.stats?.passes, sizes: S.map((x) => x.n), ts: S.map((x) => x.t) }); };
  const t0 = Date.now(); let last = "", lastChange = t0, rec = null;
  for (;;) {
    rec = JSON.parse(await page.evaluate(REC));
    const key = rec.n + "/" + rec.chars;
    if (key !== last) { last = key; lastChange = Date.now(); }
    console.log(`t=${((Date.now() - t0) / 1000).toFixed(0)}s n=${rec.n} chars=${rec.chars} passes=${rec.passes}`);
    if (Date.now() - lastChange >= 25000 || Date.now() - t0 >= CAP * 1000) break;
    await sleep(5000);
  }
  console.log(`FINAL n=${rec.n} chars=${rec.chars} (${Date.now() - lastChange >= 25000 ? "stopped growing" : "still growing at the cap"}) sizes ${JSON.stringify(rec.sizes)}`);
  await page.close();
} finally { await browser.close(); }
