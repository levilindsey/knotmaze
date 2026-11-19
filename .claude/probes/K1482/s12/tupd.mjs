// K1482 s12: today's renderer at link A's frozen state (the cap.mjs recipe), then: does the frame change with more
// update() passes, and which display object draws what. Same physics hash throughout (no stepping after the freeze).
//   node .claude/probes/K1482/s12/tupd.mjs <base> <outDir> <profileDir>
//   env HASH (fff8c9e5)  SIMT=20  DSF=2  TRIES=6  Q (extra query, default "" = today as Levi sees it)  TAG (file prefix)
//   writes <TAG>u0.png (as cap.mjs shoots it), <TAG>u1.png (one more r.update()), <TAG>u30.png (30 more),
//   <TAG>hide_<i>.png (root child i not renderable), <TAG>tupd.json (children, update counts, renderer flags)
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [, , base, outDir, profileDir] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), TRIES = +(process.env.TRIES ?? 6);
const HASH = process.env.HASH ?? "fff8c9e5", TAG = process.env.TAG ?? "";
const query = `3.FGH1HtvQeDjm6e4BII&xp=off&am=instant${process.env.Q ?? ""}`;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const T0 = Date.now(); const T = () => ((Date.now() - T0) / 1000).toFixed(0) + "s";
async function frames(page, n) {
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f, n) => window.__knotLoop().frames > f + n, { timeout: 900000, polling: 200 }, f0, n);
  await sleep(500);
}
const out = { query, steps: [] };
try {
  let done = false;
  for (let k = 0; k < TRIES && !done; k++) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log(`pageerror ${e.message.slice(0, 200)}`));
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
    await page.goto(`${base}/?${query}&phw=0&snd=none&prp=off`, { waitUntil: "load", timeout: 900000 });
    await page.bringToFront();
    await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
    { const f0 = await page.evaluate(() => window.__knotLoop().frames); await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 300 }, f0); } // cap12's wait, no sleep
    const h = await page.evaluate(async (t) => {
      await window.__knotPhysFreeze(true); await window.__knotStepUntil(t);
      const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
      window.__knotLoop?.({ continuous: true });
      const d = await window.__knotPhysDump(); const hh = d?.hashes ?? d; return { h: String(hh?.all ?? JSON.stringify(hh).slice(0, 80)), simT: d.simTime };
    }, SIMT);
    console.log(T(), JSON.stringify(h));
    if (h.h !== HASH && k < TRIES - 1) { console.log(T(), `hash ${h.h} != ${HASH}, reload`); await page.close(); continue; }
    out.freeze = h;
    // count update() calls from here on (wrapped after the freeze: a wrapper or a dump before it moved the hash)
    await page.evaluate(() => { const r = window.__knotRenderer(); const u = r.update.bind(r); window.__upd = 0; r.update = (...a) => { window.__upd++; return u(...a); }; });
    await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
    await sleep(1500); await frames(page, 6); await sleep(700); await page.mouse.move(2, 2);
    const shot = async (nm, note) => { await page.screenshot({ path: join(outDir, `${TAG}${nm}.png`) }); const u = await page.evaluate(() => window.__upd); out.steps.push({ nm, note, updates: u }); console.log(T(), nm, "updates so far", u); };
    const rc = () => page.evaluate(() => { const r = window.__knotRenderer(); return { geomRev: r.geomRev, rebuilds: r.joinery.filletRebuildCount, key: r.joinery.filletKey }; });
    out.rc0 = await rc();
    await shot("u0", "as cap.mjs");
    await frames(page, 10); out.rc1 = await rc();
    await page.evaluate(() => { window.__knotRenderer().rebuildFillets(true); }); await frames(page, 4); out.rc2 = await rc(); await shot("rf", "+rebuildFillets(true)");
    await page.evaluate(() => { const r = window.__knotRenderer(); r.update(); r.tickPaint(0); }); await frames(page, 4); out.rc3 = await rc(); await shot("tp", "+update()+tickPaint(0)");
    console.log(T(), JSON.stringify({ rc0: out.rc0, rc1: out.rc1, rc2: out.rc2, rc3: out.rc3 }).replace(/"key":"[^"]*"/g, (m) => m.slice(0, 60)));
    await page.evaluate(() => { window.__knotRenderer().update(); }); await frames(page, 4); await shot("u1", "+1 update()");
    await page.evaluate(() => { const r = window.__knotRenderer(); for (let i = 0; i < 30; i++) r.update(); }); await frames(page, 4); await shot("u30", "+30 update()");
    out.children = await page.evaluate(() => { const r = window.__knotRenderer(); return r.root.children.map((c, i) => ({ i, label: c.label ?? c.name ?? "", type: c.constructor?.name, n: c.children?.length ?? 0, renderable: c.renderable, visible: c.visible })); });
    for (const c of out.children) {
      if (!c.visible || !c.renderable) continue;
      await page.evaluate((i) => { window.__knotRenderer().root.children[i].renderable = false; }, c.i);
      await frames(page, 4); await page.screenshot({ path: join(outDir, `${TAG}hide_${c.i}.png`) });
      await page.evaluate((i) => { window.__knotRenderer().root.children[i].renderable = true; }, c.i);
      await frames(page, 4);
    }
    out.junctions = await page.evaluate(() => { const r = window.__knotRenderer(); const o = {}; for (const k of [36, 55, 87]) { const j = r.junctionArms?.[k]; if (j) o["j" + k] = { arms: j.arms.map((a) => ({ ...a })), particles: [...j.particles] }; } return o; });
    out.post = await page.evaluate(async () => { const d = await window.__knotPhysDump(); return { simT: d.simTime, h: d.hashes?.all }; });
    writeFileSync(join(outDir, `${TAG}tupd.json`), JSON.stringify(out, null, 1));
    await page.close(); done = true;
  }
} finally { await browser.close(); }
console.log(T(), "done");
