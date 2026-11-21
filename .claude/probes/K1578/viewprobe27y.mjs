// K1581 / Muse batch 27 Run Y (27Y), Done 1: why ball40's pair fits A_b at two scales.
// One load of A_b per try on one preview build, frozen on hash 98ae3432 the cap34 way
// (alignFreezeParity + freeze + StepUntil(20)), then the whole chain to the fit camera
// read at the shot: the physics dump's hash and particle bounds, the live ps bounds,
// the chainSamples (drawn) bounds, the fit inputs (threadWidth, screen), __knotView
// and the root world transform at 17 digits, plus a 6 s poll of the transform after
// the bit-still wait (creep vs stopped ticker). No screenshot: the view is the object.
//   node viewprobe27y.mjs <base> <profileDir> <out.json> [loads]
// Query is cap_maze.ps1's A_b link (&bgs=0&fw=0 added there), DSF 2, 1600x900.
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
import { waitViewStill } from "../view_still.mjs";
import { alignFreezeParity } from "../freeze_parity.mjs";

const [, , base, profileDir, outPath, loadsS] = process.argv;
const LOADS = +(loadsS ?? 2);
const SIMT = 20, HASH = "98ae3432", TRIES = 6;
const QUERY = "b.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&bgs=0&fw=0";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});

async function loadPage() {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror", String(e.message).slice(0, 200)));
  await page.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous"; window.__lost = 0;
    try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {}
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...a) {
      if (!this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => { if (this.isConnected) window.__lost++; }); }
      return gc.apply(this, a);
    };
  });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${base}/?${QUERY}&phw=0&snd=none&prp=off&rp=gf`, { waitUntil: "load", timeout: 900000 });
  await page.bringToFront();
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 240000, polling: 300 });
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 240000, polling: 300 }, f0);
  return page;
}

async function redraw(page) {
  const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw(); return globalThis.__knotGf.stats.composites; });
  await page.waitForFunction((c) => (globalThis.__knotGf?.stats?.composites ?? 0) > c + 2, { timeout: 240000, polling: 200 }, c0);
  await sleep(700);
}

const readChain = () => {
  const R = window.__knotRenderer();
  const w = R.root.worldTransform;
  const dpr = window.devicePixelRatio;
  const ps = window.__knotPS();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const P = ps.positions, n = ps.particleCount;
  for (let i = 0; i < n; i++) { const x = P[2 * i], y = P[2 * i + 1]; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
  for (const s of R.chainSamples) { if (!s) continue; const q = s.positions; for (let i = 0; i < s.count; i++) { const x = q[2 * i], y = q[2 * i + 1]; if (x < sMinX) sMinX = x; if (x > sMaxX) sMaxX = x; if (y < sMinY) sMinY = y; if (y > sMaxY) sMaxY = y; } }
  const cv = document.querySelector("canvas");
  return {
    view: window.__knotView(),
    wt: [w.a, w.b, w.c, w.d, w.tx, w.ty].map((x) => x.toPrecision(17)).join(","),
    psBounds: { minX, minY, maxX, maxY, n },
    sampleBounds: { minX: sMinX, minY: sMinY, maxX: sMaxX, maxY: sMaxY },
    threadWidth: R.style.threadWidth, dpr,
    inner: [innerWidth, innerHeight],
    canvas: cv ? [cv.width, cv.height, cv.clientWidth, cv.clientHeight] : null,
    frames: window.__knotLoop().frames, lost: window.__lost,
    gf: { switchedMs: globalThis.__knotGf?.stats?.switchedMs, composites: globalThis.__knotGf?.stats?.composites, passes: globalThis.__knotGf?.stats?.passes },
  };
};

const results = [];
try {
  for (let li = 0; li < LOADS; li++) {
    let done = null;
    for (let k = 0; k < TRIES && !done; k++) {
      const page = await loadPage();
      await alignFreezeParity(page, SIMT);
      const h = await page.evaluate(async (t) => {
        await window.__knotPhysFreeze(true);
        await window.__knotStepUntil(t);
        const r = window.__knotRenderer();
        r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
        window.__knotLoop?.({ continuous: true });
        const d = await window.__knotPhysDump();
        const hh = d?.hashes ?? d; return String(hh?.all ?? JSON.stringify(hh).slice(0, 80));
      }, SIMT);
      if (h !== HASH) { console.log(`load ${li} try ${k}: hash ${h} != ${HASH}, reload`); await page.close(); continue; }
      const dump = await page.evaluate(async () => {
        const d = await window.__knotPhysDump({ arrays: true });
        const P = d.positions; let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < d.n; i++) { const x = P[2 * i], y = P[2 * i + 1]; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        return { hashes: d.hashes, simTime: d.simTime, n: d.n, bounds: { minX, minY, maxX, maxY } };
      });
      await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
      await sleep(1500);
      await redraw(page);
      const still = await waitViewStill(page);
      await sleep(3000);
      // cap34's B2 poll: 10 equal transforms, 200 ms apart, then a redraw and a re-read.
      const vw = () => page.evaluate(() => { const w = window.__knotRenderer().root.worldTransform; return [w.a, w.b, w.c, w.d, w.tx, w.ty].map((x) => x.toPrecision(17)).join(","); });
      let last = "", same = 0; const tv = Date.now();
      while (same < 10 && Date.now() - tv < 60000) { const v = await vw(); same = v === last ? same + 1 : 0; last = v; await sleep(200); }
      await redraw(page);
      const v2 = await vw();
      const chain = await page.evaluate(readChain);
      const poll = [];
      for (let i = 0; i < 12; i++) { poll.push(await vw()); await sleep(500); }
      done = { load: li, hash: h, dump, still: still ? still.v : null, b2last: last, b2v2: v2, chain, poll };
      console.log(`load ${li}: hash ${h} scale ${chain.view.s} wt ${chain.wt}`);
      await page.close();
    }
    if (!done) throw new Error(`load ${li}: no try reached ${HASH}`);
    results.push(done);
  }
} finally { await browser.close(); }
writeFileSync(outPath, JSON.stringify({ base, query: QUERY, results }, null, 1));
console.log("WROTE", outPath);
