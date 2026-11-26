// K1395 s1: today's renderer at one pinned reveal time, shot as drawn and with the knot uniforms nudged
// (fill look instead of border, debug ctrl view), to find which term breaks the burning strands into pieces.
//   node today_dbg.mjs <base> <link> <outPrefix> [frac=0.25]
// Run under scripts/perf_lock.ps1. Outputs <outPrefix>_{base,fill,dbg}.png and prints the uniforms.
import puppeteer from "puppeteer-core";
const [, , base, link, out, fracS] = process.argv;
const frac = +(fracS ?? 0.25);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  await p.goto(`${base}/?${link}&snd=none&phw=0&fw=0`, { waitUntil: "load", timeout: 120000 });
  await p.bringToFront();
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  await p.evaluate(() => window.__knotRenderer().revealPin(1e-4));
  await p.waitForFunction(() => window.__knotPerf?.().asleep === true, { timeout: 180000, polling: 250 }).catch(() => console.log("not asleep"));
  await p.evaluate(() => window.__knotLoop({ continuous: true }));
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  await p.evaluate((t) => window.__knotRenderer().revealPin(t), frac * dur);
  await sleep(1500);
  await p.screenshot({ path: `${out}_base.png` });
  const info = await p.evaluate(() => {
    const R = window.__knotRenderer();
    const seen = new Set();
    let grp = null;
    const walk = (c) => { if (!c || seen.has(c) || grp) return; seen.add(c); const g = c.shader?.resources?.knotUniforms; if (g?.uniforms) { grp = g; return; } for (const k of c.children ?? []) walk(k); };
    walk(R.root);
    window.__kug = grp;
    if (!grp) return null;
    const U = grp.uniforms;
    const pick = (n) => (U[n] ? Array.from(U[n]).map((v) => +(+v).toFixed(4)) : null);
    return { uKLook: pick("uKLook"), uKFx: pick("uKFx"), uKFx2: pick("uKFx2"), uKInk: pick("uKInk"), uKBase: pick("uKBase"), uKPaint: pick("uKPaint") };
  });
  console.log(JSON.stringify(info));
  if (info) {
    const shot = async (name, set, restore) => {
      await p.evaluate(set);
      await sleep(900);
      await p.screenshot({ path: `${out}_${name}.png` });
      await p.evaluate(restore);
      await sleep(600);
    };
    await shot("fill", () => { const U = window.__kug.uniforms; window.__kl = U.uKLook[0]; U.uKLook[0] = 0; window.__kug.update(); }, () => { window.__kug.uniforms.uKLook[0] = window.__kl; window.__kug.update(); });
    await shot("dbg", () => { const U = window.__kug.uniforms; U.uKBase[2] = 1; window.__kug.update(); }, () => { window.__kug.uniforms.uKBase[2] = 0; window.__kug.update(); });
    await shot("nofx", () => { const U = window.__kug.uniforms; window.__kf = U.uKFx[3]; U.uKFx[3] = 0; window.__kug.update(); }, () => { window.__kug.uniforms.uKFx[3] = window.__kf; window.__kug.update(); });
  }
} finally { await b.close(); }
