// K1395 s2: per-sample reveal FX state beside the shot it belongs to. One load (today or rp=gf, midReveal),
// pinned reveal at FRAC of the duration, at the slept state (as s1's pinsheet.mjs), one screenshot, then per
// chain and sample: its screen point, the CPU mirror's kFxColor alpha / pRain / ignition at the sample's ctrl
// (what gf's GfFxTable bakes), the glow, and the chain's fxHere. alpha.py reads the pixels under the samples.
//   node alpha.mjs <base> <link> <today|gf> <frac> <outPrefix>
// Run under scripts/perf_lock.ps1. Writes <outPrefix>.png and <outPrefix>.json.
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, link, mode, fracS, out] = process.argv;
const frac = +fracS;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} window.__knotGfOpts = Object.assign(window.__knotGfOpts ?? {}, { midReveal: true }); });
  p.on("pageerror", (e) => console.log("pageerror", e.message.slice(0, 200)));
  await p.goto(`${base}/?${link}&snd=none&phw=0&fw=0${mode === "gf" ? "&rp=gf" : ""}`, { waitUntil: "load", timeout: 120000 });
  await p.bringToFront();
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  await p.evaluate(() => window.__knotRenderer().revealPin(1e-4));
  if (mode === "gf") {
    let stable = 0, last = "";
    for (let k = 0; k < 900 && stable < 20; k++) {
      const s = await p.evaluate(() => { const g = globalThis.__knotGf?.stats; return g ? `${g.compileIssued}/${g.compileReady}/${g.switchedMs > 0}` : "none"; });
      const [i, r, sw] = s.split("/");
      if (sw === "true" && i === r && +i > 0 && s === last) stable++; else stable = 0;
      last = s;
      await sleep(1000);
    }
  }
  await p.waitForFunction(() => window.__knotPerf?.().asleep === true, { timeout: 180000, polling: 250 }).catch(() => console.log("not asleep"));
  await sleep(1000);
  await p.evaluate((t) => window.__knotRenderer().revealPin(t), frac * dur);
  await sleep(1500);
  if (mode === "gf") { const c0 = await p.evaluate(() => globalThis.__knotGf.stats.composites); for (let k = 0; k < 20; k++) { await sleep(300); if ((await p.evaluate(() => globalThis.__knotGf.stats.composites)) > c0 + 2) break; } }
  await p.screenshot({ path: `${out}.png` });
  // DBG=6,7,1: today's debug views (6 = aM, lookA, gk; 7 = fract ctrl, fract 16 ctrl, hiA; 1 = kCtrlNear) - view 6/7
  // exist only in an uncommitted shader edit (K1395S2TMP).
  if (mode === "today" && process.env.DBG) {
    await p.evaluate(() => window.__knotLoop?.({ continuous: true }));
    for (const v of process.env.DBG.split(",")) {
      await p.evaluate((v) => { window.__knotRenderer().paintDebug = v; }, +v);
      await sleep(800);
      await p.screenshot({ path: `${out}_d${v}.png` });
    }
    await p.evaluate(() => { window.__knotRenderer().paintDebug = 0; });
    await sleep(500);
  }
  const r = await p.evaluate(async () => {
    const pm = await import("/src/render/paint_math.ts");
    const md = await import("/src/render/paint_model.ts");
    const R = window.__knotRenderer();
    const U = md.knotUniformValues();
    const D = R.kd;
    const rect = (document.querySelector("canvas") ?? document.body).getBoundingClientRect();
    const st = Math.round(U.uKFx[0]);
    const chains = [];
    const rgb = [0, 0, 0];
    const o = { pRain: 0, alpha: 1 };
    for (let ch = 0; ch < R.chainSamples.length; ch++) {
      const s = R.chainSamples[ch];
      const c = R.kcv?.[ch];
      if (!s || !c) { chains.push(null); continue; }
      const fxHere = U.uKFx[3] > 0.5 && st > 0 && U.uKFx[2] < c.fxDone;
      const n = c.nCtrl;
      const rows = [];
      let slot = 0;
      for (let k = 0; k < s.count; k++) {
        const a = pm.kSampleArc(c, k);
        while (slot < n - 1 && pm.kCA(D, c, slot + 1) <= a) slot++;
        const a0 = pm.kCA(D, c, slot);
        const a1 = slot < n - 1 ? pm.kCA(D, c, slot + 1) : c.total;
        const ctrl = slot + (a1 > a0 ? Math.min(1, (a - a0) / (a1 - a0)) : 0);
        rgb[0] = rgb[1] = rgb[2] = 0;
        pm.kFxColor(D, U, c, ctrl, k, rgb, o);
        const g = pm.kIgnition(D, U, c, ctrl);
        const glow = pm.kGlow(D, U, c, ctrl); const mk = pm.kRevealMaskAt(D, U, c, ctrl);
        const P = R.root.toGlobal({ x: s.positions[2 * k], y: s.positions[2 * k + 1] });
        rows.push([+(P.x + rect.left).toFixed(2), +(P.y + rect.top).toFixed(2), +o.alpha.toFixed(4), +o.pRain.toFixed(4), g.hit ? +g.tA.toFixed(4) : -1, +glow.toFixed(4), +ctrl.toFixed(4), +mk.toFixed(4)]);
      }
      const caps = R.g3Caps ? [R.g3Caps[2 * ch], R.g3Caps[2 * ch + 1]] : null;
      const ents = (R.junctionCutEntries ?? []).filter((e) => e.chain === ch).map((e) => ({ center: +e.center.toFixed(3), lo: +e.lo.toFixed(3), hi: +e.hi.toFixed(3), left: e.left, right: e.right }));
      let arcS = 0; const arcs = [0];
      for (let k = 1; k < s.count; k++) { arcS += Math.hypot(s.positions[2 * k] - s.positions[2 * k - 2], s.positions[2 * k + 1] - s.positions[2 * k - 1]); arcs.push(+arcS.toFixed(3)); }
      chains.push({ ch, fxHere, fxDone: c.fxDone, closed: c.closed, rows, caps, ents, arcs });
    }
    const jfh = R.style.threadWidth / 2;
    const jinfo = { L: jfh * R.FILLET_REACH_PER_HALF * R.cuspRadius, cusp: R.cuspRadius, nEntries: (R.junctionCutEntries ?? []).length, filletLayer: !!R.filletLayer };
    const G = globalThis.__knotGf; const last = (a) => (a && a.length ? a[a.length - 1] : null); const gs = G ? { rvActive: last(G.stats.rvActive), rvKnots: last(G.stats.rvKnots), rvPasses: G.stats.rvPasses, composites: G.stats.composites, revealOn: R.revealOn, fxLive: R.fxLive } : { revealOn: R.revealOn, fxLive: R.fxLive }; return { st, uKFx: Array.from(U.uKFx), uKInk: Array.from(U.uKInk), gs, jinfo, chains };
  });
  r.dur = dur; r.frac = frac; r.mode = mode;
  writeFileSync(`${out}.json`, JSON.stringify(r));
  console.log("st", r.st, "uKFx", r.uKFx.map((v) => +v.toFixed(4)).join(","), "gs", JSON.stringify(r.gs), "chains", r.chains.filter(Boolean).length);
} finally { await b.close(); }
