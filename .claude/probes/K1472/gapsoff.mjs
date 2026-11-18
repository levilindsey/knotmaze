// K1472 s3: is today's mid-reveal "broken pieces" look its crossing gaps? One load (today's renderer), the
// reveal pinned at FR, shot with the gaps on, then gaps.setEnabled(false), shot again.
//   node gapsoff.mjs <base> <link> <frac> <outPrefix>
import puppeteer from "puppeteer-core";
const [, , base, link, frac, out] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  await p.goto(`${base}/?${link}&snd=none&phw=0&fw=0`, { waitUntil: "load", timeout: 120000 });
  await p.bringToFront();
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  await p.evaluate(() => window.__knotRenderer().revealPin(1e-4));
  await p.waitForFunction(() => window.__knotPerf?.().asleep === true, { timeout: 180000, polling: 250 }).catch(() => console.log("not asleep"));
  await sleep(1000);
  await p.evaluate((t) => { window.__knotLoop?.({ continuous: true }); window.__knotRenderer().revealPin(t); }, +frac * dur);
  await sleep(2000);
  await p.screenshot({ path: `${out}_on.png` });
  console.log(await p.evaluate(() => { const g = window.__knotRenderer().gaps; g.setEnabled(false); g.upload?.(); return typeof g.setEnabled; }));
  await sleep(2000);
  await p.screenshot({ path: `${out}_off.png` });
  await p.evaluate(() => { const g = window.__knotRenderer().gaps; g.setEnabled(true, true); g.upload?.(); });
  await sleep(2000);
  await p.screenshot({ path: `${out}_tint.png` });
} finally { await b.close(); }
