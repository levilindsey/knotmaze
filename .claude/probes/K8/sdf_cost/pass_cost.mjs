// pass_cost.mjs (K8 sdf cost): what the thread pass itself costs, in one
// frozen page per path, by toggling it. bench_frame times whole frames;
// this renders the same frozen stage in a loop and isolates the pass.
//   node pass_cost.mjs <host> <out.json> <query> [rounds=6] [n=24]
// Pages: <query> (the default strip pass) and <query>&rp=sdf. Each waits
// for sleep (phw=0 expected), freezes, pins k83's clocks, then renders
// renderer.lastObjectRendered n times per variant (a 1-px readPixels after
// each render: the GPU has finished), variants alternating in ABBA order
// over the rounds. Variants: full; nogap (maskEnabled false, update());
// hidden (the thread pass not drawn: the SdfPass mesh, or every strip
// fill, renderable false). full - hidden = the pass; full - nogap = the
// gap search inside it. 1600x900 at dpr 2, as bench_frame.
import puppeteer from "puppeteer-core";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const [, , host, outFile, query, roundsArg, nArg] = process.argv;
const ROUNDS = Number(roundsArg ?? 6), N = Number(nArg ?? 24);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 1600, H = 900, DPR = 2;

async function waitAsleep(page, maxMs = 180000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const ok = await page.evaluate(() => { const p = window.__knotPerf(); return (p.state === "frozen" || p.asleep) && !p.plucks; });
    if (ok) return Date.now() - t0;
    await sleep(500);
  }
  return -1;
}

const SETUP = () => {
  const r = window.__knotRenderer(), proto = Object.getPrototypeOf(r);
  r.advanceClocks = function () {}; r.paintClock = 100; r.pulseBorn = 0;
  r.tickPaint = function () { return proto.tickPaint.call(this, 0); };
  r.flowTime = 0;
  const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
  if (L) { L.tick = function () { return false; }; }
  const R = L.renderer, gl = R.gl, stage = R.lastObjectRendered;
  const px = new Uint8Array(4);
  const pass = r.stripPass;
  // The build is minified (constructor.name is mangled): SdfPass is the
  // pass with rootMesh().
  const sdf = typeof pass.rootMesh === "function";
  const meshes = sdf ? [pass.rootMesh()] : pass.fills.map((f) => f.mesh);
  const variants = {
    full: () => { meshes.forEach((m) => { m.renderable = true; }); if (!r.maskEnabled) { r.maskEnabled = true; r.update(); } },
    nogap: () => { meshes.forEach((m) => { m.renderable = true; }); if (r.maskEnabled) { r.maskEnabled = false; r.update(); } },
    hidden: () => { meshes.forEach((m) => { m.renderable = false; }); if (!r.maskEnabled) { r.maskEnabled = true; r.update(); } },
  };
  window.__k8pc = { variants, pass: pass.constructor.name, meshes: meshes.length,
    time(v, n) {
      variants[v]();
      for (let i = 0; i < 3; i++) { R.render({ container: stage }); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
      const t = [];
      for (let i = 0; i < n; i++) {
        const t0 = performance.now();
        R.render({ container: stage });
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        t.push(performance.now() - t0);
      }
      t.sort((a, b) => a - b);
      return { p50: t[n >> 1], min: t[0], err: gl.getError(), lost: gl.isContextLost() };
    } };
  return { pass: window.__k8pc.pass, meshes: meshes.length };
};

mkdirSync(dirname(outFile), { recursive: true });
mkdirSync(join(HERE, "profiles"), { recursive: true });
const profile = mkdtempSync(join(HERE, "profiles", "pc-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    `--window-size=${W + 120},${H + 160}`],
});
const res = { host, query, rounds: ROUNDS, n: N, pages: {} };
try {
  for (const [name, q] of [["def", query], ["sdf", `${query}&rp=sdf`]]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR });
    await page.goto(`${host}/?${q}`, { waitUntil: "load", timeout: 90000 });
    await page.bringToFront();
    await page.mouse.move(1, 1);
    await page.waitForFunction(() => typeof window.__knotPerf === "function" && window.__knotRenderer && window.__knotRenderer(), { timeout: 90000, polling: 250 });
    const restMs = await waitAsleep(page);
    await page.evaluate(async () => { if (typeof window.__knotPhysFreeze === "function") await window.__knotPhysFreeze(true); });
    const info = await page.evaluate(SETUP);
    await sleep(500);
    const order = ["full", "nogap", "hidden"];
    const runs = { full: [], nogap: [], hidden: [] };
    for (let k = 0; k < ROUNDS; k++) {
      for (const v of (k % 2 ? [...order].reverse() : order)) runs[v].push(await page.evaluate((vv, n) => window.__k8pc.time(vv, n), v, N));
    }
    const med = (a) => { const s = a.map((x) => x.p50).sort((p, q) => p - q); return s[s.length >> 1]; };
    const sum = Object.fromEntries(Object.entries(runs).map(([v, a]) => [v, +med(a).toFixed(2)]));
    sum.pass = +(sum.full - sum.hidden).toFixed(2);
    sum.gap = +(sum.full - sum.nogap).toFixed(2);
    res.pages[name] = { q, restMs, info, errors, summary: sum, runs };
    console.log(name, JSON.stringify({ restMs, ...info, ...sum, errors: errors.length, glErr: runs.full.map((x) => x.err).filter((e) => e).length }));
    await page.close();
  }
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
}
writeFileSync(outFile, JSON.stringify(res, null, 1));
