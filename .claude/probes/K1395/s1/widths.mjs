// K1395 s1: today's per-chain reveal widths (renderer.widthLast, widthMulFor's output after the taper) at one
// pinned reveal time, in a today load or an rp=gf load (midReveal, gate:false so main's ribbon update runs).
//   node widths.mjs <base> <link> <today|gf> <frac> <out.json>
// Run under scripts/perf_lock.ps1. Writes per chain [shown fraction (width > 0.01), mean width] and the clocks.
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, link, mode, fracS, outF] = process.argv;
const frac = +fracS;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} window.__knotGfOpts = Object.assign(window.__knotGfOpts ?? {}, { midReveal: true, gate: false }); });
  await p.goto(`${base}/?${link}&snd=none&phw=0&fw=0${mode === "gf" ? "&rp=gf" : ""}`, { waitUntil: "load", timeout: 120000 });
  await p.bringToFront();
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  await p.evaluate(() => window.__knotRenderer().revealPin(1e-4));
  if (mode === "gf") {
    let stable = 0, last = "";
    for (let k = 0; k < 600 && stable < 10; k++) {
      const s = await p.evaluate(() => { const g = globalThis.__knotGf?.stats; return g ? `${g.compileIssued}/${g.compileReady}/${g.switchedMs > 0}` : "none"; });
      const [i, r, sw] = s.split("/");
      if (sw === "true" && i === r && +i > 0 && s === last) stable++; else stable = 0;
      last = s;
      await sleep(1000);
    }
  }
  await p.waitForFunction(() => window.__knotPerf?.().asleep === true, { timeout: 180000, polling: 250 }).catch(() => console.log("not asleep"));
  await p.evaluate(() => window.__knotLoop({ continuous: true }));
  await p.evaluate((t) => window.__knotRenderer().revealPin(t), frac * dur);
  await sleep(1500);
  const r = await p.evaluate(() => {
    const R = window.__knotRenderer();
    const fx = R.revealFx;
    const rows = [];
    for (let ch = 0; ch < (R.widthLast?.length ?? 0); ch++) {
      const w = R.widthLast[ch];
      if (!w) { rows.push(null); continue; }
      let on = 0, sum = 0;
      for (let i = 0; i < w.length; i++) { if (w[i] > 0.01) on++; sum += w[i]; }
      rows.push([+(on / w.length).toFixed(3), +(sum / w.length).toFixed(3)]);
    }
    return { t: fx.revealAnim?.t, paintClock: R.paintClock, wall0: fx.revealWall0, revealOn: fx.revealOn, fxLive: fx.fxLive, rows };
  });
  writeFileSync(outF, JSON.stringify({ mode, frac, dur, ...r }));
  console.log(mode, frac, "t", r.t, "pc-w0", r.paintClock - r.wall0, "chains", r.rows.length);
} finally { await b.close(); }
