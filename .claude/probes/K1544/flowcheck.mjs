// K1544 (Run 27I): is the draw layer that moves between loads the flow
// clock? One load of the plain link per renderer, frozen at one state
// (alignFreezeParity + SIMT), every clock pinned through
// __knotPinClocks(100); then the same frozen page is shot at
// renderer.flowTime 0 and again at 2. Nothing else moves: same dump
// hash, same bit-still view. A large thread-area diff between the two
// shots (counted by analyze.py / k1223_diff.py) names the flow
// displacement (src/render/ribbon/paint_state.ts: tickPaint advances
// flowTime; the plain link's flowStrength defaults to 0.3, link A's
// token sets it to 0).
//   node .claude/probes/K1544/flowcheck.mjs <base> <outDir> <profileDir>
//     env SIMT=20 DSF=2
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
import { waitViewStill } from "../view_still.mjs";
const [, , base, outDir, profileDir] = process.argv;
if (!base || !outDir || !profileDir) { console.error("usage: flowcheck.mjs <base> <outDir> <profileDir>"); process.exit(2); }
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2);
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  for (const mode of ["today", "gf"]) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log(`[${mode}] pageerror ${e.message}`));
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
    // No fw=0 and no bg=none here: the flow must be live so its clock can move the shot.
    await page.goto(`${base}/?3&xp=off&am=instant&prp=off&phw=0&snd=none` + (mode === "gf" ? "&rp=gf&gfh=1" : ""), { waitUntil: "load", timeout: 900000 });
    await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
    if (mode === "gf") await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
    await alignFreezeParity(page, SIMT);
    const hash = await page.evaluate(async (t) => {
      await window.__knotPhysFreeze(true);
      await window.__knotStepUntil(t);
      window.__knotPinClocks(100);
      window.__knotLoop?.({ continuous: true });
      const d = await window.__knotPhysDump();
      return d.hashes.all;
    }, SIMT);
    await waitViewStill(page);
    for (const [si, ft] of [0, 2, 0].entries()) {
      const got = await page.evaluate(async (v) => {
        const r = window.__knotRenderer();
        r.flowTime = v;
        // tickPaint is wrapped at dt 0 by the pin, so the value holds; a
        // few frames re-sample the ribbons (and rebuild gf's tables).
        return r.flowTime;
      }, ft);
      if (mode === "gf") {
        for (let k = 0; k < 3; k++) {
          const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw(); return globalThis.__knotGf.stats.composites; });
          await page.waitForFunction((c) => (globalThis.__knotGf?.stats?.composites ?? 0) > c + 2, { timeout: 120000, polling: 100 }, c0);
          await sleep(500);
        }
      } else {
        const f0 = await page.evaluate(() => window.__knotLoop().frames);
        await page.waitForFunction((f) => window.__knotLoop().frames > f + 10, { timeout: 120000, polling: 200 }, f0);
        await sleep(500);
      }
      const now = await page.evaluate(async () => { const r = window.__knotRenderer(); const d = await window.__knotPhysDump(); return { flowTime: r.flowTime, hash: d.hashes.all, params: window.__knotParams?.().flowStrength }; });
      const png = await page.screenshot({ type: "png" });
      const name = `${mode}_s${si}_ft${ft}.png`;
      writeFileSync(join(outDir, name), png);
      console.log(`[${mode}] hash ${hash} shot ${name} setFlow ${ft} readFlow ${got} atShot flowTime ${now.flowTime} flowStrength ${now.params} dumpHash ${now.hash}`);
    }
    await page.close();
  }
} finally { await browser.close(); }
