// K1472 s2 item 0: today's frame vs rp=gf's frame BEFORE gf composes, at pinned reveal times.
// Pins the reveal clock from load, shoots each fraction at once (no compile wait), records gf's stats beside
// each shot (a gf shot counts only while composites == 0), then unpins and shoots unpinned frames at UN secs.
//   PROFILE=<dir> node preswitch.mjs <base> <link> <today|gf> <outPrefix>
// env VW/VH (900x900), FR (fractions, default 0.1,0.25,0.4,0.55,0.7), UN (unpinned secs after load, default none)
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, link, mode, out] = process.argv;
const VW = +(process.env.VW ?? 900), VH = +(process.env.VH ?? 900);
const FR = (process.env.FR ?? "0.1,0.25,0.4,0.55,0.7").split(",").map(Number);
const UN = process.env.UN ? process.env.UN.split(",").map(Number) : [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
const log = [];
const say = (...a) => { const s = a.join(" "); console.log(s); log.push(s); };
try {
  const p = await b.newPage();
  await p.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  p.on("pageerror", (e) => say("pageerror", e.message.slice(0, 200)));
  p.on("console", (m) => { const t = m.text(); if (/K1472|gf|error/i.test(t)) say("console", t.slice(0, 200)); });
  const url = `${base}/?${link}&snd=none&phw=0&fw=0${mode === "gf" ? "&rp=gf" : ""}`;
  const t0 = Date.now(); const T = () => ((Date.now() - t0) / 1000).toFixed(1);
  await p.goto(url, { waitUntil: "load", timeout: 120000 });
  await p.bringToFront();
  const gfs = () => p.evaluate(() => { const g = globalThis.__knotGf?.stats; return g ? { c: g.composites, i: g.compileIssued, r: g.compileReady, sw: g.switchedMs > 0 } : null; });
  if (UN.length) {
    const tl = Date.now();
    for (const t of UN) {
      await sleep(Math.max(0, t * 1000 - (Date.now() - tl)));
      const f = `${out}_u${t}.png`;
      await p.screenshot({ path: f });
      say(T(), `u${t}`, JSON.stringify(await p.evaluate(() => { const r = window.__knotReveal?.(); return r ? { c: +r.clock.toFixed(2), d: r.duration, done: r.done } : null; })), JSON.stringify(await gfs()));
    }
  }
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  say(T(), "reveal duration", dur.toFixed(3));
  for (let i = 0; i < FR.length; i++) {
    const t = Math.max(FR[i] * dur, 1e-4);
    await p.evaluate((t) => window.__knotRenderer().revealPin(t), t);
    await sleep(1500);
    const f = `${out}_p${i}.png`;
    await p.screenshot({ path: f });
    say(T(), `p${i} t=${t.toFixed(3)} (${FR[i]})`, JSON.stringify(await p.evaluate(() => { const r = window.__knotReveal(); return { c: r.clock, done: r.done }; })), JSON.stringify(await gfs()));
  }
  writeFileSync(`${out}.json`, JSON.stringify({ url, dur, log }, null, 1));
} finally { await b.close(); }
