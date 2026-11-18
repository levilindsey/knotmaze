import puppeteer from "puppeteer-core";
const [, , url, prof, out] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
const p = await b.newPage();
await p.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
await p.evaluateOnNewDocument(() => { const iv = setInterval(() => { if (typeof window.__knotPhysFreeze === "function" && window.__knotPS?.()) { clearInterval(iv); window.__knotPhysFreeze(true); } }, 0); });
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: "load", timeout: 900000 });
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const s = await p.evaluate(() => { const g = globalThis.__knotGf; return g ? { sw: g.stats.switchedMs, comp: g.stats.composites, iss: g.stats.compileIssued, rdy: g.stats.compileReady } : null; });
  console.log(i, JSON.stringify(s));
  if (s && s.sw > 0) {
    const c0 = s.comp; await p.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; });
    await new Promise((r) => setTimeout(r, 3000));
    const h = await p.evaluate(async () => { const d = await window.__knotPhysDump(); const x = d?.hashes ?? d; return String(x?.all ?? ""); });
    console.log("hash", h, "comp", c0, "->", await p.evaluate(() => globalThis.__knotGf.stats.composites));
    await p.screenshot({ path: out });
    break;
  }
}
await b.close();
