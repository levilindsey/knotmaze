// K1395 s1: what gf_app's fxSnap reads for today's junction cuts on a link (no screenshot).
//   node jcut.mjs <base> <link> [frac=0.25]
import puppeteer from "puppeteer-core";
const [, , base, link, fracS] = process.argv;
const frac = +(fracS ?? 0.25);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
  await p.goto(`${base}/?${link}&snd=none&phw=0&fw=0`, { waitUntil: "load", timeout: 120000 });
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  await p.evaluate((t) => window.__knotRenderer().revealPin(t), frac * dur);
  await new Promise((r) => setTimeout(r, 1500));
  const r = await p.evaluate(() => {
    const R = window.__knotRenderer();
    const keys = [];
    for (let o = R; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) for (const k of Object.getOwnPropertyNames(o)) if (/junction|g3Cap|cusp|FILLET|jCut|JunctionCut/i.test(k)) keys.push(k);
    const e = R.junctionCutEntries;
    const caps = R.g3Caps;
    return {
      keys: [...new Set(keys)],
      threadWidth: R.style?.threadWidth, cusp: R.cuspRadius, reach: R.FILLET_REACH_PER_HALF,
      entries: e ? { n: e.length, first: e.slice(0, 4) } : String(e),
      caps: caps ? { n: caps.length, fused: Array.from(caps).filter((v) => v >= 4).length } : String(caps),
    };
  });
  console.log(JSON.stringify(r, null, 1));
} finally { await b.close(); }
