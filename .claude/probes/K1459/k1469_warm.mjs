import puppeteer from "puppeteer-core";
const [, , base, link, am, maxS = "240"] = process.argv;
const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, protocolTimeout: 900000, userDataDir: process.env.PROFILE,
  args: [...(process.env.XARGS ? process.env.XARGS.split(" ") : []), "--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=560,680", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 520, height: 520, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => { window.__lost = 0; window.addEventListener("webglcontextlost", () => { window.__lost++; }, true); });
  await page.goto(`${base}/?${link}${am !== "def" ? `&am=${am}` : ""}&snd=none&phw=0&fw=0&rp=gf`, { waitUntil: "load" });
  const t0 = Date.now(); let last = "", stable = 0;
  while ((Date.now() - t0) / 1000 < +maxS) {
    const s = await page.evaluate(() => { const g = globalThis.__knotGf?.stats; return g ? { i: g.compileIssued, r: g.compileReady, c: g.composites, first: g.compileFirstMs, sw: g.switchedMs, fb: g.fallback, lost: window.__lost, rv: window.__knotReveal?.()?.clock ?? null } : null; });
    if (s && s.i === s.r && s.i >= 6) { if (++stable >= 6) break; } else stable = 0; const j = JSON.stringify(s); if (j !== last) console.log(Math.round((Date.now() - t0) / 1000), j); last = j;
    await new Promise((r) => setTimeout(r, 2000));
  }
} finally { await browser.close(); }
