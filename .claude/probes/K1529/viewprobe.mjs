// K1529 (27B): the view's trajectory after the freeze, 3 loads of link A.
// Loads like cap21b (phw=0, clocks pinned), freezes on fff8c9e5 (parity aligned),
// then polls __knotView + the root world transform every 200 ms for 12 s:
// is the view still moving at the moment s21's path shoots (sleep 1500 + one
// redraw), and does it land on the same bits on every load?
//   node .claude/probes/K1529/viewprobe.mjs <base> <outDir>
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
const [, , base, outDir] = process.argv;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const prof = join(process.env.TEMP, "k1529-viewprobe-profile");
const Q = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&bgs=0&phw=0&snd=none&prp=off&rp=gf";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
for (let load = 1; load <= 3; load++) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__lost = 0; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${base}/?${Q}`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 300 }, f0);
  await alignFreezeParity(page, 20);
  const hash = await page.evaluate(async () => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(20);
    const r = window.__knotRenderer();
    r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
    if (window.__knotPinClocks) window.__knotPinClocks(100);
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? "?");
  });
  const t0 = Date.now();
  const rows = [];
  for (let k = 0; k < 60; k++) {
    const v = await page.evaluate(() => {
      const R = window.__knotRenderer(); const w = R.root.worldTransform;
      const view = window.__knotView();
      return { wt: [w.a, w.b, w.c, w.d, w.tx, w.ty].map((x) => x.toPrecision(17)).join(","), x: view.x, y: view.y, s: view.s, dpr: devicePixelRatio, frames: window.__knotLoop().frames };
    });
    rows.push({ ms: Date.now() - t0, ...v });
    await sleep(200);
  }
  // distinct transforms and the first index from which it never changes again
  let stillFrom = rows.length - 1;
  for (let k = rows.length - 2; k >= 0; k--) { if (rows[k].wt === rows[rows.length - 1].wt) stillFrom = k; else break; }
  writeFileSync(join(outDir, `traj_load${load}.json`), JSON.stringify({ load, hash, stillFromMs: rows[stillFrom].ms, final: rows[rows.length - 1], rows }, null, 1));
  console.log(`load ${load} hash ${hash}: still from ${rows[stillFrom].ms} ms; at 2200 ms x=${rows[11].x.toPrecision(17)} y=${rows[11].y.toPrecision(17)} s=${rows[11].s.toPrecision(17)}; final x=${rows[rows.length - 1].x.toPrecision(17)} y=${rows[rows.length - 1].y.toPrecision(17)} s=${rows[rows.length - 1].s.toPrecision(17)}`);
  await page.close();
}
await browser.close();
