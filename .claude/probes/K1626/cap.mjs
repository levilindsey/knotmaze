// K1626 copy of .claude/probes/kink/cap.mjs (main checkout). kink-diag: one settled state of a link, shot by today's look and by rp=gf,
// with everything needed to measure the centre lines offline (kink.py):
// the physics dump (hash + positions), the chains (particle per control
// slot), the renderer's drawn samples (chainSamples: the centre line both
// renderers draw), gf's own vertex table (__knotGf.tables vx/vy per chain:
// the polyline gf's SDF is evaluated against), the thread width and the
// root's world transform (world -> CSS px).
//
//   node .claude/probes/kink/cap.mjs <base> <outDir> <profileDir>
//     env LINK='?3.FGH1HtvQeDjm6e4BII&am=instant' DSF=2 W=1200 H=1200
//         RENDERERS=today,gf LOADS=1 EXTRA='&phw=0&fw=0&snd=none&prp=off'
//
// Recipe (K1544 repro.mjs, MODE=asleep): phw=0 (in-thread: one state per
// load), wait for asleep, freeze where it lies, pin clocks
// (__knotPinClocks), wait for a bit-still view, gf gets three warm redraws.
// Headed, real time, off-screen, one kept profile. Outputs untracked.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { waitViewStill } from "../view_still.mjs";
const [, , base, outDir, profileDir] = process.argv;
if (!base || !outDir || !profileDir) { console.error("usage: cap.mjs <base> <outDir> <profileDir>"); process.exit(2); }
const LINK = process.env.LINK ?? "?3.FGH1HtvQeDjm6e4BII&am=instant";
const EXTRA = process.env.EXTRA ?? "&phw=0&fw=0&snd=none&prp=off";
const DSF = +(process.env.DSF ?? 2), W = +(process.env.W ?? 1200), H = +(process.env.H ?? 1200);
const LOADS = +(process.env.LOADS ?? 1);
const RENDERERS = (process.env.RENDERERS ?? "today,gf").split(",").filter(Boolean);
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", `--window-size=${W + 40},${H + 120}`,
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const linkOf = (mode) => `${base}/${LINK}${EXTRA}` + (mode === "gf" ? "&rp=gf&gfh=1" : "");
try {
  for (const mode of RENDERERS) {
    for (let load = 1; load <= LOADS; load++) {
      const page = await browser.newPage();
      let lost = 0;
      page.on("pageerror", (e) => console.log(`[${mode} ${load}] pageerror ${e.message}`));
      page.on("console", (m) => { if (/context lost|webglcontextlost/i.test(m.text())) lost++; });
      await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
      await page.setViewport({ width: W, height: H, deviceScaleFactor: DSF });
      const t0 = Date.now();
      await page.goto(linkOf(mode), { waitUntil: "load", timeout: 900000 });
      await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
      // BEND='{"ratio":1.25}': K90's render-side bend bound on (spline_generator
      // splineBend) before the knot sleeps, so the settling frames resample with it.
      if (process.env.BEND) await page.evaluate((o) => window.__knotSplineBend(true, JSON.parse(o)), process.env.BEND);
      if (mode === "gf") await page.waitForFunction(() => (globalThis.__knotGf?.stats?.passes ?? 0) > 0, { timeout: 900000, polling: 500 });
      await page.waitForFunction(() => window.__knotPerf?.()?.asleep === true, { timeout: 300000, polling: 300 });
      const frozen = process.env.NOFREEZE === "1" ? { hash: null, pinned: false, nofreeze: true } : await page.evaluate(async () => {
        await window.__knotPhysFreeze(true);
        const pinned = window.__knotPinClocks ? window.__knotPinClocks(100) : false;
        if (!pinned) { const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; }
        window.__knotLoop?.({ continuous: true });
        const d = await window.__knotPhysDump();
        return { hash: d.hashes.all, simTime: d.simTime, pinned };
      });
      await sleep(2000);
      const still = await waitViewStill(page);
      if (mode === "gf") {
        for (let k = 0; k < 3; k++) {
          const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw(); return globalThis.__knotGf.stats.composites; });
          await page.waitForFunction((c) => (globalThis.__knotGf?.stats?.composites ?? 0) > c + 2, { timeout: 120000, polling: 100 }, c0);
          await sleep(600);
        }
      } else {
        const f0 = await page.evaluate(() => window.__knotLoop().frames);
        await page.waitForFunction((f) => window.__knotLoop().frames > f + 6, { timeout: 120000, polling: 200 }, f0);
        await sleep(600);
      }
      const data = await page.evaluate(async () => {
        const d = await window.__knotPhysDump({ arrays: true });
        const r = window.__knotRenderer();
        const ps = window.__knotPS();
        const w = r.root.worldTransform;
        const samples = r.chainSamples.map((s) => s ? ({ count: s.count, closed: s.closed, total: s.totalLength,
          pos: Array.from(s.positions), cal: Array.from(s.controlArcLengths) }) : null);
        const chains = ps.chains.map((c) => Array.from(c));
        let gfT = null;
        const T = globalThis.__knotGf?.tables;
        if (T) gfT = { nC: T.nC, h: T.h, W: T.W, cV0: Array.from(T.cV0), cNV: Array.from(T.cNV), cClosed: Array.from(T.cClosed),
          vx: Array.from(T.vx), vy: Array.from(T.vy) };
        return {
          hash: d.hashes.all, hashes: d.hashes, simTime: d.simTime, kind: d.kind, n: d.n,
          positions: Array.from(d.positions), zPos: d.zPos ? Array.from(d.zPos) : null,
          chains, breakAfter: Array.from(ps.chainBreakAfter), samples, fused: ps.fusedJunctions.map((g) => Array.from(g)), xs: ps.crossings.map((X) => ({ over: { chain: X.over.chain, ctrl: X.over.ctrl }, under: { chain: X.under.chain, ctrl: X.under.ctrl } })),
          threadWidth: r.style.threadWidth, lean: r.lean, leanNow: r.leanNow, flow: r.flowStrength,
          wt: { a: w.a, b: w.b, c: w.c, d: w.d, tx: w.tx, ty: w.ty }, dpr: devicePixelRatio,
          params: window.__knotParams?.(), asleep: window.__knotPerf()?.asleep,
          gf: globalThis.__knotGf ? { passes: globalThis.__knotGf.stats?.passes, composites: globalThis.__knotGf.stats?.composites, fallback: globalThis.__knotGf.stats?.fallback } : null,
          gfT,
          canvases: Array.from(document.querySelectorAll("canvas")).map((c) => { const b = c.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, cw: c.width, ch: c.height, z: getComputedStyle(c).zIndex }; }),
          screen: { w: r.app?.screen?.width, h: r.app?.screen?.height, res: r.app?.renderer?.resolution },
          build: document.title,
        };
      });
      const png = await page.screenshot({ type: "png" });
      const name = `${mode}_load${load}`;
      writeFileSync(join(outDir, `${name}.png`), png);
      writeFileSync(join(outDir, `${name}.json`), JSON.stringify({ load, mode, frozen, viewStill: still, lost, ...data }));
      console.log(`[${mode} ${load}/${LOADS}] hash ${data.hash} (freeze ${frozen.hash}) simT ${data.simTime} n ${data.n} chains ${data.chains.length} tw ${data.threadWidth} lean ${data.lean} flow ${data.flow} viewStill ${still ? still.v : "UNSETTLED"} gf ${JSON.stringify(data.gf)} lost ${lost} ready ${Date.now() - t0} ms`);
      await page.close();
    }
  }
} finally { await browser.close(); }
