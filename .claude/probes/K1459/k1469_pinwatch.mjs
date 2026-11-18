import puppeteer from "puppeteer-core";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
const [, , base, link, pinT = "7.984", maxS = "330"] = process.argv;
const out = process.env.OUT; mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, protocolTimeout: 900000, userDataDir: process.env.PROFILE,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=560,680", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 520, height: 520, deviceScaleFactor: 1 });
  await page.goto(`${base}/?${link}&snd=none&phw=0&fw=0&rp=gf`, { waitUntil: "load" });
  await page.bringToFront();
  await page.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 300000, polling: 250 });
  console.log("pin", await page.evaluate((t) => window.__knotRenderer().revealPin(t), +pinT));
  const t0 = Date.now(); let lastR = -1;
  while ((Date.now() - t0) / 1000 < +maxS) {
    const s = await page.evaluate(() => { const g = globalThis.__knotGf?.stats; return g ? { i: g.compileIssued, r: g.compileReady, c: g.composites, sw: g.switchedMs } : null; });
    if (s && s.r !== lastR) { lastR = s.r; await new Promise((r) => setTimeout(r, 1500)); await page.screenshot({ path: join(out, `pw_r${s.r}.png`) }); console.log(Math.round((Date.now() - t0) / 1000), JSON.stringify(s)); }
    await new Promise((r) => setTimeout(r, 3000));
    if (s && s.r >= 9) {
      console.log("unpin", await page.evaluate(() => { const R = window.__knotRenderer(); delete R.advanceClocks; const a = R.revealFx.revealAnim; delete a.tick; return { t: a.t, done: a.done }; }));
      for (let k = 0; k < 10; k++) { await new Promise((r) => setTimeout(r, 500)); await page.screenshot({ path: join(out, `live_${k}.png`) }); console.log(k, JSON.stringify(await page.evaluate(() => ({ clock: window.__knotReveal?.()?.clock, done: window.__knotReveal?.()?.done, rv: globalThis.__knotGf?.stats?.rvPasses })))); }
      break;
    }
  }
} finally { await browser.close(); }
