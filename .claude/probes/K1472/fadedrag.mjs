// K1472 s2 item 4: Levi's "the entire maze blinks in and out constantly" and "I don't see any fading,
// regardless of the slider value". Loads a link (warm profile: gf takes over), waits for the switch and
// the reveal's end, then drags the panel's "Crossing fade" slider with the real mouse through STOPS,
// shooting the page after every mouse step (frames f<n>.png) and logging gf's state beside each: the
// fade the page holds, gf's composites, switched, fallback and the look. After each stop it waits 2 s
// and shoots s<value>.png. Ink counts (python fadeink.py) find a blink: a frame with far less maze.
// PRESWITCH=1 drags as soon as the reveal ends, gf switched or not (a cold profile: today's renderer under gf's compiles).
//   PROFILE=<dir> node fadedrag.mjs <base> <link> <outDir> [stops=0,1.2,0.6,0.14]
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
const [, , base, link, out, stopArg = "0,1.2,0.6,0.14"] = process.argv;
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1440,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
const log = [];
const say = (...a) => { const s = a.join(" "); console.log(s); log.push(s); };
try {
  const p = await b.newPage();
  await p.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "1"); } catch {} });
  p.on("pageerror", (e) => say("pageerror", e.message.slice(0, 200)));
  const url = `${base}/?${link}&snd=none`;
  await p.goto(url, { waitUntil: "load", timeout: 120000 });
  await p.bringToFront();
  const t0 = Date.now();
  if (process.env.PRESWITCH) await p.waitForFunction(() => window.__knotReveal?.()?.done, { timeout: 600000, polling: 250 });
  else await p.waitForFunction(() => globalThis.__knotGf?.stats?.switchedMs > 0 && window.__knotReveal?.()?.done, { timeout: 600000, polling: 250 });
  say("switched + reveal done after", ((Date.now() - t0) / 1000).toFixed(1), "s");
  await sleep(1500);
  const state = () => p.evaluate(() => {
    const g = globalThis.__knotGf; const s = g?.stats;
    return { fl: window.__knotParams?.().fadeLength, rfl: window.__knotRenderer?.().fadeLength, c: s?.composites, sw: s?.switchedMs > 0, fb: s?.fallback ?? s?.why ?? null, home: g?.home?.fade };
  });
  const rect = () => p.evaluate(() => {
    const lab = [...document.querySelectorAll(".tp-lblv_l")].find((e) => e.textContent.startsWith("Crossing fade"));
    if (!lab) return null;
    const row = lab.closest(".tp-lblv");
    for (let f = row; f; f = f.parentElement) if (f.classList?.contains("tp-fldv") && !f.classList.contains("tp-fldv-expanded")) f.querySelector(".tp-fldv_b")?.click();
    row.scrollIntoView({ block: "center" });
    const t = row.querySelector(".tp-sldv_t"), k = row.querySelector(".tp-sldv_k"), i = row.querySelector("input");
    const r = t?.getBoundingClientRect(), kr = k?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height, kx: kr ? kr.x + kr.width / 2 : null, box: i?.value } : "notrack";
  });
  let r = await rect(); await sleep(800); r = await rect();
  say("track", JSON.stringify(r), "state", JSON.stringify(await state()));
  await p.screenshot({ path: `${out}/start.png` });
  let n = 0;
  for (const v of stopArg.split(",")) {
    r = await rect();
    const y = r.y + r.h / 2, x0 = r.kx ?? r.x + r.w * (Number(r.box) / 1.2), x1 = r.x + 1 + (r.w - 2) * (Number(v) / 1.2);
    await p.mouse.move(x0, y); await p.mouse.down();
    for (let s = 1; s <= 12; s++) {
      await p.mouse.move(x0 + (x1 - x0) * s / 12, y);
      await sleep(40);
      const f = `${out}/f${String(n).padStart(3, "0")}.png`;
      await p.screenshot({ path: f });
      say(`f${n}`, `to ${v} step ${s}`, JSON.stringify(await state()));
      n++;
    }
    await p.mouse.up(); await p.mouse.move(20, 880);
    for (let k = 0; k < 6; k++) {
      await sleep(330);
      await p.screenshot({ path: `${out}/f${String(n).padStart(3, "0")}.png` });
      say(`f${n}`, `held at ${v}`, JSON.stringify(await state()));
      n++;
    }
    await p.screenshot({ path: `${out}/s${v}.png` });
    say("stop", v, "box", (await rect()).box, JSON.stringify(await state()));
  }
  writeFileSync(`${out}/log.json`, JSON.stringify({ url, log }, null, 1));
} finally { await b.close(); }
