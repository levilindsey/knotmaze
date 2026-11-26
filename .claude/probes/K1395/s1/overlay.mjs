// K1395 s1: which chains today's reveal shows at a pinned time, as screen polylines, beside gf's shot of the
// same page. Per chain: state (0 hidden: t < tStart, 1 full: t >= tDone, 2 partial) from the renderer's own
// revealSpan and uKFx[1] clock, and its samples mapped through the root's transform.
//   node overlay.mjs <base> <link> <frac> <outPrefix>
// Run under scripts/perf_lock.ps1. Writes <outPrefix>_gf.png and <outPrefix>.json; overlay.py draws them.
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, link, fracS, out] = process.argv;
const frac = +fracS;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} window.__knotGfOpts = Object.assign(window.__knotGfOpts ?? {}, { midReveal: true, gate: false }); });
  // TODAY=1: today's renderer (no rp=gf, no compile wait); the shot is then <outPrefix>_gf.png all the same
  const today = process.env.TODAY === "1";
  await p.goto(`${base}/?${link}&snd=none&phw=0&fw=0${today ? "" : "&rp=gf"}`, { waitUntil: "load", timeout: 120000 });
  await p.bringToFront();
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  await p.evaluate(() => window.__knotRenderer().revealPin(1e-4));
  let stable = 0, last = "";
  for (let k = 0; k < 600 && stable < 10 && !today; k++) {
    const s = await p.evaluate(() => { const g = globalThis.__knotGf?.stats; return g ? `${g.compileIssued}/${g.compileReady}/${g.switchedMs > 0}` : "none"; });
    const [i, r, sw] = s.split("/");
    if (sw === "true" && i === r && +i > 0 && s === last) stable++; else stable = 0;
    last = s;
    await sleep(1000);
  }
  await p.waitForFunction(() => window.__knotPerf?.().asleep === true, { timeout: 180000, polling: 250 }).catch(() => console.log("not asleep"));
  await p.evaluate(() => window.__knotLoop({ continuous: true }));
  await p.evaluate((t) => window.__knotRenderer().revealPin(t), frac * dur);
  await sleep(1500);
  await p.screenshot({ path: `${out}_gf.png` });
  const r = await p.evaluate((ovFx) => {
    globalThis.__ovFx = ovFx;
    const R = window.__knotRenderer();
    const fx = R.revealFx;
    const t = fx.revealAnim?.t;
    const rect = (document.querySelector("canvas") ?? document.body).getBoundingClientRect();
    const chains = [];
    for (let ch = 0; ch < R.chainSamples.length; ch++) {
      const s = R.chainSamples[ch];
      if (!s) { chains.push(null); continue; }
      const [t0, t1] = fx.paintScene.revealSpan(ch);
      // FX=1: state 2 = the chain's FX live (fxNow < its fxDone, both shaders' fxHere), 1 = revealed, FX done
      const kc = (fx.kcv ?? R.kcv)?.[ch];
      const fxNow = R.paintClock - fx.revealWall0;
      const st = t < t0 ? 0 : globalThis.__ovFx ? (kc && fxNow < kc.fxDone ? 2 : 1) : t >= t1 ? 1 : 2;
      const pts = [];
      for (let k = 0; k < s.count; k += 3) { const g = R.root.toGlobal({ x: s.positions[2 * k], y: s.positions[2 * k + 1] }); pts.push(+(g.x + rect.left).toFixed(1), +(g.y + rect.top).toFixed(1)); }
      chains.push({ ch, st, t0: +t0.toFixed(3), t1: +t1.toFixed(3), pts });
    }
    return { t, fxNow: R.paintClock - fx.revealWall0, kcv: !!(fx.kcv ?? R.kcv), chains };
  }, process.env.FX === "1");
  writeFileSync(`${out}.json`, JSON.stringify(r));
  const n = [0, 0, 0]; for (const c of r.chains) if (c) n[c.st]++;
  console.log("t", r.t, "fxNow", r.fxNow, "kcv", r.kcv, process.env.FX === "1" ? "hidden/fxDone/fxLive" : "hidden/full/partial", n.join("/"));
} finally { await b.close(); }
