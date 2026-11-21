// K1544 (Run 27I): do 6 loads of the plain link hold one state, one view and
// one picture? Per load: the probe hash, a whole dump of the stepping state
// (__knotPhysDump({arrays:true}): positions, prev, zPos, passes - the arrays
// src/physics/probe_dump.ts hashes), the view (scale and offset, CSS and
// device) and a shot. Pairwise numbers come from analyze.py (positions in
// world units and in device px, view agreement, px over 24 in the thread
// area).
//
//   node .claude/probes/K1544/repro.mjs <base> <outDir> <profileDir>
//     env SIMT=20 DSF=2 LOADS=6 MODE=aligned|asleep RECIPE=probe|26z RENDERERS=today,gf
//
// MODE=aligned (default) is dragcheck.mjs's recipe: alignFreezeParity, then
// freeze + __knotStepUntil(SIMT) - one fixed sim time on every load.
// MODE=asleep waits for the live knot to fall asleep (perf.asleep), then
// freezes where it lies (no StepUntil). RECIPE=26z is k1223_cap.mjs's
// literal recipe (the one behind K1544's counts): the plain link plus
// phw=0&snd=none only (gf without gfh), asleep, manual clock pin
// (advanceClocks/paintClock/pulseBorn; no tickPaint wrap, no fw=0, no
// bg=none). The probe recipe pins every clock through
// __knotPinClocks(100) (K1530: tickPaint at dt 0 included) and waits for
// the view to hold bit-still (view_still.mjs, K1529) before the shot; gf
// gets two warm redraws after the pin before its shot (27A). Links: the
// plain link ?3&xp=off&am=instant plus dragcheck's probe params
// (prp=off, phw=0, fw=0, bg=none, snd=none); gf adds rp=gf&gfh=1.
// Headed, real time, off-screen; one kept profile. Captures untracked.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
import { waitViewStill } from "../view_still.mjs";
const [, , base, outDir, profileDir] = process.argv;
if (!base || !outDir || !profileDir) { console.error("usage: repro.mjs <base> <outDir> <profileDir>"); process.exit(2); }
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2);
const LOADS = +(process.env.LOADS ?? 6), MODE = process.env.MODE ?? "aligned";
const RECIPE = process.env.RECIPE ?? "probe"; // probe | 26z (k1223_cap.mjs's literal recipe)
const RENDERERS = (process.env.RENDERERS ?? "today,gf").split(",").filter(Boolean);
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const linkOf = (mode) => RECIPE === "26z"
  ? `${base}/?3&xp=off&am=instant&phw=0&snd=none` + (mode === "gf" ? "&rp=gf" : "")
  : `${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none` + (mode === "gf" ? "&rp=gf&gfh=1" : "");
try {
  for (const mode of RENDERERS) {
    for (let load = 1; load <= LOADS; load++) {
      const page = await browser.newPage();
      page.on("pageerror", (e) => console.log(`[${mode} ${load}] pageerror ${e.message}`));
      await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
      await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
      const t0 = Date.now();
      await page.goto(linkOf(mode), { waitUntil: "load", timeout: 900000 });
      await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
      if (mode === "gf") await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
      if (MODE === "asleep" || RECIPE === "26z") await page.waitForFunction(() => window.__knotPerf?.()?.asleep === true, { timeout: 300000, polling: 300 });
      await alignFreezeParity(page, SIMT);
      const frozen = await page.evaluate(async (t, modeName, recipe) => {
        await window.__knotPhysFreeze(true);
        if (modeName === "aligned" && recipe !== "26z") await window.__knotStepUntil(t);
        let pinned = false;
        if (recipe === "26z") { const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; }
        else { pinned = window.__knotPinClocks ? window.__knotPinClocks(100) : false; if (!pinned) { const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; } }
        window.__knotLoop?.({ continuous: true });
        const d = await window.__knotPhysDump({ arrays: true });
        const view = window.__knotView();
        const perf = window.__knotPerf();
        const r = window.__knotRenderer();
        return { dump: d, view, pinned, asleep: perf?.asleep, substeps: perf?.substeps, frozenPerf: perf?.frozen, clocks: { paintClock: r?.paintClock, flowTime: r?.flowTime } };
      }, SIMT, MODE, RECIPE);
      await sleep(2500);
      const still = await waitViewStill(page);
      if (mode === "gf") {
        for (let k = 0; k < (RECIPE === "26z" ? 1 : 3); k++) {
          const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw(); return globalThis.__knotGf.stats.composites; });
          await page.waitForFunction((c) => (globalThis.__knotGf?.stats?.composites ?? 0) > c + 2, { timeout: 120000, polling: 100 }, c0);
          await sleep(600);
        }
      } else {
        const f0 = await page.evaluate(() => window.__knotLoop().frames);
        await page.waitForFunction((f) => window.__knotLoop().frames > f + 6, { timeout: 120000, polling: 200 }, f0);
        await sleep(600);
      }
      // The dump above predates the warm redraws; the state is frozen, but
      // re-dump beside the shot so the saved arrays are the shot's state.
      const shot = await page.evaluate(async () => {
        const d = await window.__knotPhysDump({ arrays: true });
        const r = window.__knotRenderer();
        return { dump: d, view: window.__knotView(), asleep: window.__knotPerf()?.asleep,
          clocks: { paintClock: r?.paintClock, flowTime: r?.flowTime, pulseBorn: r?.pulseBorn, params: window.__knotParams?.() },
          gf: globalThis.__knotGf ? { composites: globalThis.__knotGf.stats?.composites, passes: globalThis.__knotGf.stats?.passes } : null };
      });
      const png = await page.screenshot({ type: "png" });
      const name = `${mode}_load${load}`;
      writeFileSync(join(outDir, `${name}.png`), png);
      writeFileSync(join(outDir, `${name}.json`), JSON.stringify({
        load, mode, recipe: MODE, simt: SIMT,
        hash: shot.dump.hashes.all, hashes: shot.dump.hashes,
        hashAtFreeze: frozen.dump.hashes.all,
        simTime: shot.dump.simTime, gen: shot.dump.gen, n: shot.dump.n, c: shot.dump.c, kind: shot.dump.kind,
        view: shot.view, viewStill: still, pinned: frozen.pinned, clocks: shot.clocks, gfStats: shot.gf,
        asleep: shot.asleep, asleepAtFreeze: frozen.asleep, substeps: frozen.substeps,
        positions: shot.dump.positions, prev: shot.dump.prev, zPos: shot.dump.zPos, passes: shot.dump.passes,
      }));
      console.log(`[${mode} ${load}/${LOADS}] ${MODE} hash ${shot.dump.hashes.all} (freeze ${frozen.dump.hashes.all}) simT ${shot.dump.simTime} n ${shot.dump.n} c ${shot.dump.c} viewStill ${still ? still.v : "UNSETTLED"} ready ${Date.now() - t0} ms`);
      await page.close();
    }
  }
} finally { await browser.close(); }
