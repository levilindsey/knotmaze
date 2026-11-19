// K1482 s10: today's renderer at link A's frozen state, same-state toggles that say which mechanism draws today's
// outline at a pixel, plus today's own numbers for chosen crossings (r.inspectIndex: CROSSING INSPECT's split, the
// over polyline's caps oCaps, the window, the cut).
//   node .claude/probes/K1482/s10/ttog.mjs <base> <outDir> <profileDir> <crossing,crossing,...>
//   env HASH (fff8c9e5)  SIMT=20  DSF=2  TRIES=8  Q (extra query, default &bg=none&cs=mono)
//   writes <outDir>/t_base.png, t_nomask.png, t_noprot.png, t_nofans.png, inspect.json
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [, , base, outDir, profileDir, xs = ""] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), TRIES = +(process.env.TRIES ?? 8);
const HASH = process.env.HASH ?? "fff8c9e5";
const query = `3.FGH1HtvQeDjm6e4BII&xp=off&am=instant${process.env.Q ?? "&bg=none&cs=mono"}`;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const T0 = Date.now(); const T = () => ((Date.now() - T0) / 1000).toFixed(0) + "s";
const logs = [];
async function frames(page, n) {
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f, n) => window.__knotLoop().frames > f + n, { timeout: 900000, polling: 200 }, f0, n);
  await sleep(500);
}
try {
  let done = false;
  for (let k = 0; k < TRIES && !done; k++) {
    const page = await browser.newPage();
    page.on("console", (m) => { const t = m.text(); if (t.startsWith("CROSSING INSPECT")) logs.push(JSON.parse(t.slice(17))); });
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
    await page.goto(`${base}/?${query}&phw=0&snd=none&prp=off`, { waitUntil: "load", timeout: 900000 });
    await page.bringToFront();
    await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
    await frames(page, 20);
    const h = await page.evaluate(async (t) => {
      await window.__knotPhysFreeze(true); await window.__knotStepUntil(t);
      const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
      window.__knotLoop?.({ continuous: true });
      const d = await window.__knotPhysDump(); const hh = d?.hashes ?? d; return String(hh?.all ?? JSON.stringify(hh).slice(0, 80));
    }, SIMT);
    if (h !== HASH) { console.log(T(), `hash ${h} != ${HASH}, reload`); await page.close(); continue; }
    await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
    await sleep(1200); await frames(page, 6); await page.mouse.move(2, 2);
    await page.screenshot({ path: join(outDir, "t_base.png") });
    for (const x of xs.split(",").filter(Boolean)) { await page.evaluate((i) => { const r = window.__knotRenderer(); r.inspectIndex = i; r.update(); }, +x); await sleep(100); }
    const shots = [
      ["t_nomask", "r.maskEnabled = false; r.update();", "r.maskEnabled = true; r.update();"],
      ["t_noprot", "r.protect = false; r.update();", "r.protect = true; r.update();"],
      ["t_nofans", "r.root.children[1].renderable = false;", "r.root.children[1].renderable = true;"],
      ["t_nojp", "r.skipJointPairs = false; r.update(); r.rebuildFillets(true);", "r.skipJointPairs = true; r.update(); r.rebuildFillets(true);"],
    ];
    for (const [nm, on, off] of shots) {
      await page.evaluate((s) => { const r = window.__knotRenderer(); new Function("r", s)(r); }, on);
      await frames(page, 6); await page.screenshot({ path: join(outDir, `${nm}.png`) });
      await page.evaluate((s) => { const r = window.__knotRenderer(); new Function("r", s)(r); }, off);
      await frames(page, 6);
    }
    await page.screenshot({ path: join(outDir, "t_base2.png") });
    const extra = await page.evaluate((list) => {
      const r = window.__knotRenderer(); const o = {};
      for (const i of list) { const c = r.ps.crossings[i]; if (!c) continue; o[i] = { over: c.over.chain, under: c.under.chain, wins: r.chainWins.get(c.under.chain), joints: { over: r.junctionArcCtrls.get(c.over.chain), under: r.junctionArcCtrls.get(c.under.chain) } }; }
      return o;
    }, xs.split(",").filter(Boolean).map(Number));
    writeFileSync(join(outDir, "inspect.json"), JSON.stringify({ hash: h, inspect: logs, extra }, null, 1));
    console.log(T(), "shot, inspect rows", logs.length);
    await page.close(); done = true;
  }
} finally { await browser.close(); }
console.log(T(), "done");
