// K1472 s2: rp=gf at rest, one build against another on ONE frozen state (K1458/fade.mjs's recipe: phw=0, frozen
// at SIMT through __knotStepUntil, paint clocks pinned, a forced redraw). Shoots <out>_<tag>.png and prints the
// physics hash beside it; diff two tags with diffimg.py.
// env NORESET=1 no-ops the Pixi renderer's resetState (attributes the K1472 s2 finally against a build without it).
// env NOCW=1 refuses the gf compile worker (the app links its own programs; use a fresh profile).
// env ALLREADY=1 waits until every program gf issued is ready before freezing.
//   PROFILE=<dir> node restab.mjs <base> <link> <outPrefix> <tag>     env SIMT=20 DSF=1
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, link, out, tag] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1000,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  p.on("pageerror", (e) => console.log("pageerror", e.message));
  await p.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  if (process.env.NOCW) await p.evaluateOnNewDocument(() => { const W = window.Worker; window.Worker = function (u, o) { if (o?.name === "knot-gf-compile") throw new Error("K1472 probe: no compile worker"); return new W(u, o); }; window.Worker.prototype = W.prototype; });
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: DSF });
  const t0 = Date.now();
  await p.goto(`${base}/?${link}&phw=0&snd=none`, { waitUntil: "load", timeout: 900000 });
  await p.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  await p.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
  if (process.env.ALLREADY) await p.waitForFunction(() => { const s = globalThis.__knotGf.stats; return s.compileIssued > 0 && s.compileReady === s.compileIssued && s.compileIssued >= +(window.__ALLN ?? 0); }, { timeout: 900000, polling: 500 });
  if (process.env.ALLREADY) console.log("compiles", JSON.stringify(await p.evaluate(() => [globalThis.__knotGf.stats.compileIssued, globalThis.__knotGf.stats.compileReady, (Date.now() - performance.timeOrigin) | 0])));
  if (process.env.NORESET) console.log("noreset", await p.evaluate(() => { const r = window.__knotBackgroundLayer?.()?.renderer; if (!r) return "no renderer"; r.resetState = () => {}; return "patched"; }));
  const hash = await p.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    const r = window.__knotRenderer();
    r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
  }, SIMT);
  await sleep(2500);
  const c0 = await p.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; return globalThis.__knotGf.stats.composites; });
  await p.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 60000, polling: 100 }, c0);
  await sleep(600);
  writeFileSync(`${out}_${tag}.png`, await p.screenshot({ type: "png" }));
  console.log(`[${tag}] ready ${Date.now() - t0} ms hash ${hash}`, JSON.stringify(await p.evaluate(() => ({ fb: globalThis.__knotGf.stats.fallback, c: globalThis.__knotGf.stats.composites }))));
} finally { await b.close(); }
