// K1456 s2: which frame-loop flags drive frames at rest while gf's programs compile (cold), via __knotLoop().
//   node loopflags.mjs <url> <freshProfile> [atSecs=30] [spanSecs=10]
import puppeteer from "puppeteer-core";
const [, , url, prof, atArg = "30", spanArg = "10"] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 600000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage(); await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const t0 = Date.now(); await p.goto(url, { waitUntil: "load", timeout: 600000 }); await p.bringToFront();
  await new Promise((r) => setTimeout(r, Math.max(0, t0 + +atArg * 1000 - Date.now())));
  await p.evaluate(() => window.__knotLoop({ reset: true }));
  await new Promise((r) => setTimeout(r, +spanArg * 1000));
  const rep = await p.evaluate(() => { const l = window.__knotLoop(); const g = globalThis.__knotGf?.stats; const pf = window.__knotPerf?.(); return { mode: l.mode, frames: l.frames, flags: l.flags, empty: l.empty, sw: g?.switchedMs > 0, comp: g?.composites, asleep: pf?.asleep, state: pf?.state, fw: window.__knotParams?.().flowStrength }; });
  console.log(JSON.stringify(rep));
} finally { await b.close(); }
