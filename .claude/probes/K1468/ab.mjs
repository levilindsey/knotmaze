// K1468 Done 3: frozen-state captures of gf for the pixel A/B (K1460 shot.mjs's freeze, per link, fade and look).
// Saves <outDir>/<link>_<fl>_<tlk>.png and prints each load's physics hash; diff two builds' dirs with diff.py.
//   node .claude/probes/K1468/ab.mjs <base> <outDir> <profileDir> "<A|B|R>:<fl>:<tlk>,..."
//   R = the K868 ring link at rp=gf&gfh=1 (K1479: SIMT=40.01666666666504 lands hash 50dd4ffd).
//   Every load aligns the freeze substep parity first (alignFreezeParity, K1479), so one link
//   freezes on one physics state per build instead of the two-state lottery K1468 s2 saw.
//   A = ?3.FGH1HtvQeDjm6e4BII&...&rp=gf&gfh=1, B = ?3&...&rp=gf. env SIMT=20 DSF=2 EXTRA="--chrome-flag ..."
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
const [, , base, outDir, profileDir, jobArg] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2);
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    ...(process.env.EXTRA ? process.env.EXTRA.split(" ") : [])],
});
const LINKS = { A: "?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1", B: "?3&xp=off&am=instant&rp=gf", R: "?s=1rphqy1&gs=12&shp=ring&wd=.45&sl=1&dr=.75&rep=1.45&bd=2.5&sm=.6&ga=.2&tw=.58&gap=.04&cr=3&fv=1&am=instant&stb=0&rp=gf&gfh=1" };
const linkOf = (l, fl, tlk) => `${base}/${LINKS[l]}&prp=off&phw=0&fw=0&bg=none&snd=none&fl=${fl}&tlk=${tlk}`;
let lost = 0;
try {
  for (const job of jobArg.split(",")) {
    const [l, fl, tlk] = job.split(":");
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log(`[${job}] pageerror ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") console.log(`[${job}] console.${m.type()} ${m.text().slice(0, 300)}`); });
    await page.evaluateOnNewDocument(() => {
      window.__knotLoopMode = "continuous";
      globalThis.__k1468lost = 0;
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, o) {
        const c = g.call(this, t, o);
        if (c && /webgl/.test(t) && !this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => { globalThis.__k1468lost++; }); }
        return c;
      };
    });
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
    await page.goto(linkOf(l, fl, tlk), { waitUntil: "load", timeout: 900000 });
    await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
    await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
    await alignFreezeParity(page, SIMT);
    const hash = await page.evaluate(async (t) => {
      await window.__knotPhysFreeze(true);
      await window.__knotStepUntil(t);
      const r = window.__knotRenderer();
      r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
      window.__knotLoop?.({ continuous: true });
      const d = await window.__knotPhysDump();
      const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
    }, SIMT);
    await sleep(2500);
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 900000, polling: 100 }, c0);
    await sleep(600);
    writeFileSync(join(outDir, `${l}_${fl}_${tlk}.png`), await page.screenshot({ type: "png" }));
    const info = await page.evaluate(() => ({ lost: globalThis.__k1468lost, fb: globalThis.__knotGf?.stats?.fallback ?? null }));
    lost += info.lost;
    console.log(`[${job}] hash ${hash} lost ${info.lost} fallback ${info.fb}`);
    await page.close();
  }
} finally { await browser.close(); }
console.log(`DONE lost=${lost}`);
