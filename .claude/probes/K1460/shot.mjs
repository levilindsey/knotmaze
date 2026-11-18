// K1460: fade.mjs's frozen-state captures, nothing measured. Saves <outDir>/shot_<tag>_<fl>.png per
// (mode, fl) and prints each load's physics hash. With HASH=<h>, a load whose hash differs is retried (up to
// TRIES) so every shot shows the same state (loads settle in one of two states, Handoff K1458).
//
//   node .claude/probes/K1460/shot.mjs <base> <outDir> <profileDir> "<mode>:<fl>[:tag],..." [extra query]
//     mode = today | gf | gfh; env SIMT=20 DSF=2 HASH= TRIES=6
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [, , base, outDir, profileDir, jobArg, extra = ""] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), TRIES = +(process.env.TRIES ?? 6);
let want = process.env.HASH ?? "";
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const linkOf = (mode, fl) => `${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=${fl}` +
  (mode === "gf" ? "&rp=gf" : mode === "gfh" ? "&rp=gf&gfh=1" : "") + extra;
async function load(mode, fl) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`[${mode} ${fl}] pageerror ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") console.log(`[${mode} ${fl}] console ${m.text().slice(0, 300)}`); });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  await page.goto(linkOf(mode, fl), { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (mode !== "today") await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
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
  if (mode !== "today") {
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 60000, polling: 100 }, c0);
    await sleep(600);
  }
  return { page, hash };
}
try {
  for (const job of jobArg.split(",")) {
    const [mode, fl, tag = mode] = job.split(":");
    let r;
    for (let t = 0; t < TRIES; t++) {
      r = await load(mode, fl);
      if (!want) want = r.hash;
      if (r.hash === want) break;
      console.log(`[${tag} ${fl}] hash ${r.hash} != ${want}, retry`);
      await r.page.close();
      r = null;
    }
    if (!r) { console.log(`[${tag} ${fl}] no same-state load`); continue; }
    writeFileSync(join(outDir, `shot_${tag}_${fl}.png`), await r.page.screenshot({ type: "png" }));
    console.log(`[${tag} ${fl}] hash ${r.hash}`);
    await r.page.close();
  }
} finally { await browser.close(); }
