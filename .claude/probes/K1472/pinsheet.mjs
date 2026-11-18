// K1472: one load of a link, reveal clock pinned from the start; for gf, wait until EVERY program has compiled
// (compileReady == compileIssued, unchanged for 20 s, and switched in), so the routed reveal set draws, not a
// fallback set. Then shoot each pinned reveal time on the same page (no reload: a reload restarts gf's compile
// queue), then unpin and shoot the rest frame.
//   node pinsheet.mjs <base> <link> <today|gf> <outPrefix>
// env VW/VH (default 900x900), FR (comma fractions of the duration), MAXS (compile wait cap, default 900).
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, link, mode, out] = process.argv;
const VW = +(process.env.VW ?? 900), VH = +(process.env.VH ?? 900);
const FR = (process.env.FR ?? "0,0.1,0.25,0.4,0.55,0.7,0.85,0.97").split(",").map(Number);
const MAXS = +(process.env.MAXS ?? 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
const log = [];
const say = (...a) => { const s = a.join(" "); console.log(s); log.push(s); };
try {
  const p = await b.newPage();
  await p.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} window.__knotGfOpts = Object.assign(window.__knotGfOpts ?? {}, { midReveal: true }); window.__lost = 0; window.addEventListener("webglcontextlost", () => { window.__lost++; }, true); });
  p.on("pageerror", (e) => say("pageerror", e.message.slice(0, 200)));
  const url = `${base}/?${link}&snd=none&phw=0&fw=0${mode === "gf" ? "&rp=gf" : ""}`;
  const t0 = Date.now(); const T = () => ((Date.now() - t0) / 1000).toFixed(0);
  await p.goto(url, { waitUntil: "load", timeout: 120000 });
  await p.bringToFront();
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  say(T(), "reveal duration", dur.toFixed(3), "pin", await p.evaluate(() => window.__knotRenderer().revealPin(1e-4)));
  const gfs = () => p.evaluate(() => { const g = globalThis.__knotGf?.stats; return g ? { c: g.composites, i: g.compileIssued, r: g.compileReady, sw: g.switchedMs > 0, rv: g.rvPasses, fb: g.fallback ?? null, lost: window.__lost } : null; });
  if (mode === "gf") {
    let stable = 0, last = "";
    for (let k = 0; k < MAXS; k++) {
      const s = await gfs();
      const key = s ? `${s.i}/${s.r}/${s.sw}` : "none";
      if (s && s.sw && s.i === s.r && s.i > 0 && key === last) stable++; else stable = 0;
      if (key !== last) say(T(), "gf", JSON.stringify(s));
      last = key;
      if (stable >= 20) break;
      await sleep(1000);
    }
    say(T(), "gf all compiled", JSON.stringify(await gfs()));
  }
  const shots = [];
  for (let i = 0; i < FR.length; i++) {
    const t = Math.max(FR[i] * dur, 1e-4);
    await p.evaluate((t) => window.__knotRenderer().revealPin(t), t);
    await sleep(1500);
    if (mode === "gf") { const a = await gfs(); for (let k = 0; k < 20; k++) { await sleep(300); const c = await gfs(); if (c.c > a.c + 2) break; } }
    const f = `${out}_f${i}.png`;
    await p.screenshot({ path: f });
    const st = mode === "gf" ? await gfs() : null;
    say(T(), `f${i} t=${t.toFixed(3)} (${FR[i]})`, JSON.stringify(await p.evaluate(() => { const r = window.__knotReveal(); return { c: r.clock, done: r.done }; })), JSON.stringify(st));
    shots.push({ i, fr: FR[i], t, file: f, gf: st });
  }
  // rest: drop the pin and let the reveal finish on its own clock
  await p.evaluate(() => { const R = window.__knotRenderer(); delete R.advanceClocks; const a = R.revealFx?.revealAnim; if (a) delete a.tick; });
  await p.waitForFunction(() => { const r = window.__knotReveal?.(); return !r || r.done; }, { timeout: 120000, polling: 250 }).catch(() => say("rest: reveal not done in 120 s"));
  await sleep(6000);
  await p.screenshot({ path: `${out}_rest.png` });
  say(T(), "rest", JSON.stringify(mode === "gf" ? await gfs() : null));
  writeFileSync(`${out}.json`, JSON.stringify({ url, dur, shots, log }, null, 1));
} finally { await b.close(); }
