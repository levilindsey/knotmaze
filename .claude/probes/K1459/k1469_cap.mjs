// K1459 (26B): sheet capture with geometry. Like k1395_sheet (same link, FR times,
// revealPin), but each pinned frame also dumps the renderer's chain samples and
// per-chain junction arcs, so k1459_guard2 can measure stroke widths per run on
// the material, not at fixed pixels (two loads settle a pixel or two apart).
//   node .claude/probes/K1459/k1459_cap.mjs <base> <link> <am|def> <tag>
//   env MODES=today|gf|today,gf  PROFILE=<dir> (kept; gf warms its compile there)
import puppeteer from "puppeteer-core";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [, , base, link, amArg, tag] = process.argv;
const am = amArg && amArg !== "def" ? amArg : null;
const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.OUT ?? join(here, "out", "cap");
mkdirSync(outDir, { recursive: true });
const FR = [0.0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.97];
const MODES = (process.env.MODES ?? "today,gf").split(",");
const VW = 520, VH = 520;
const profileDir = process.env.PROFILE ?? join(here, "profile-sheet");
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false, protocolTimeout: 900000,
  userDataDir: profileDir,
  args: [...(process.env.XARGS ? process.env.XARGS.split(" ") : []), "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const mode of MODES) {
    const page = await browser.newPage();
    await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    const errs = [];
    await page.evaluateOnNewDocument(() => { window.__lost = 0; window.addEventListener("webglcontextlost", () => { window.__lost++; }, true); });
    page.on("pageerror", (e) => errs.push(e.message));
    const url = `${base}/?${link}${am ? `&am=${am}` : ""}&snd=none&phw=0&fw=0${mode === "gf" ? "&rp=gf" : ""}`;
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.bringToFront();
    if (mode === "gf" && !process.env.NOWARM) {
      const tw = Date.now();
      await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 500 });
      console.log(`${tag} gf first composite (load 1) after ${((Date.now() - tw) / 1000).toFixed(0)} s, lost ${await page.evaluate(() => window.__lost)}`);
      await page.goto(url, { waitUntil: "load", timeout: 60000 });
      await page.bringToFront();
      const tw2 = Date.now();
      await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 500 });
      console.log(`${tag} gf first composite (load 2) after ${((Date.now() - tw2) / 1000).toFixed(0)} s`);
    }
    await page.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 300000, polling: 250 });
    const dur = await page.evaluate(() => window.__knotReveal().duration);
    const times = FR.map((f) => +(f * dur).toFixed(3));
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const pinned = await page.evaluate((t) => new Promise((res) => {
        const step = () => {
          const rv = window.__knotReveal();
          if (!rv || rv.done) return res({ ok: false, clock: rv?.clock ?? null });
          if (true) return res({ ok: window.__knotRenderer().revealPin(Math.max(t, 1e-4)), clock: rv.clock });
          requestAnimationFrame(step);
        };
        step();
      }), t);
      await sleep(t === 0 ? 900 : 700);
      let gst = null;
      if (mode === "gf") {
        for (let k = 0; k < 500; k++) {
          const a = await page.evaluate(() => { const g = globalThis.__knotGf?.stats; return { c: g?.composites ?? 0, i: g?.compileIssued ?? 0, r: g?.compileReady ?? 0, rv: g?.rvPasses ?? 0 }; });
          await sleep(400);
          const b = await page.evaluate(() => { const g = globalThis.__knotGf?.stats; return { c: g?.composites ?? 0, i: g?.compileIssued ?? 0, r: g?.compileReady ?? 0, rv: g?.rvPasses ?? 0 }; });
          gst = { ...b, dc: b.c - a.c, drv: b.rv - a.rv, waitS: +(k * 0.4).toFixed(1) };
          if (b.c > a.c && b.r >= 2 && k >= 3) break;
        }
        await sleep(500);
      }
      const dump = await page.evaluate(() => {
        const r = window.__knotRenderer();
        const v = window.__knotView();
        const chains = [];
        for (let ch = 0; ch < r.chainSamples.length; ch++) {
          const sm = r.chainSamples[ch];
          if (!sm) { chains.push(null); continue; }
          chains.push({ closed: r.kcv[ch].closed, pts: Array.from(sm.positions.slice(0, sm.count * 2)), jarcs: [] });
        }
        for (const jn of r.junctionArms ?? []) for (const a of jn.arms) if (chains[a.chain]) chains[a.chain].jarcs.push(a.arc0);
        return { view: v, chains };
      });
      await page.screenshot({ path: join(outDir, `${tag}_${mode}_${i}.png`) });
      writeFileSync(join(outDir, `${tag}_${mode}_${i}.json`), JSON.stringify(dump));
      console.log(`${tag} ${mode} f${i} t=${t} pinned=${JSON.stringify(pinned)} gf=${JSON.stringify(gst)} lost=${await page.evaluate(() => window.__lost)}`);
      await page.evaluate(() => {
        const r = window.__knotRenderer();
        const a2 = r.revealFx.revealAnim;
        if (a2) delete a2.tick;
        delete r.advanceClocks;
      });
    }
    await page.evaluate(() => {
      const r = window.__knotRenderer();
      const a = r.revealFx.revealAnim;
      if (a) delete a.tick;
      delete r.advanceClocks;
    });
    await page.close();
    if (errs.length) console.log("errs", errs.slice(0, 3).join(" | "));
  }
} finally {
  await browser.close();
}
